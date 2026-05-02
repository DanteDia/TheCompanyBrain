"""Router agent: query → relevant entity ids from the Skills File.

Cheap (Haiku) and fast (~1s). Its only job is to pick the subset of entities
the Q&A agent should see. We ALWAYS include all informal_rules when the query
looks operational because the rules are short and they're the moat.

If the Skills File is small (<50 entities total), we skip routing and pass the
whole graph to the Q&A agent.
"""

from __future__ import annotations

import json
from typing import Any

import structlog

from backend.config import settings
from backend.models.schemas import SkillsFile
from backend.tools.schemas import ROUTE_ENTITIES_TOOL
from backend.utils.claude_client import call_with_retry, extract_tool_use

log = structlog.get_logger("router")


ROUTER_SYSTEM = """Sos el router del Company Brain. Recibis (1) una pregunta de un empleado, y (2) un resumen compacto del Skills File de su empresa.

Tu UNICO trabajo es seleccionar los ids de entidades relevantes para la pregunta y devolverlos via el tool `route_entities`.

<principles>
- Sé inclusivo. El Q&A agent prefiere ver mas contexto, no menos.
- Si la pregunta menciona un sistema (Salesforce, JIRA, etc), incluí ese Tool y su access_path.
- Si la pregunta es operativa ("a quien le pido X", "como hago Y", "que tarda Z"), poné `include_all_informal_rules: true`.
- Si la pregunta es sobre una persona específica, incluí esa Person y sus colaboradores top.
- Cap total: 30 entidades.
</principles>"""


async def route_entities(
    skills_file: SkillsFile, query: str, *, max_entities: int = 30
) -> dict[str, Any]:
    """Return ids the Q&A agent should see for this query."""
    # Tiny graphs: skip routing entirely, return everything.
    total = (
        len(skills_file.people)
        + len(skills_file.tools)
        + len(skills_file.access_paths)
        + len(skills_file.processes)
        + len(skills_file.ticket_types)
        + len(skills_file.glossary)
    )
    if total <= 40:
        log.info("router.skip_small_graph", total=total)
        return {
            "people_ids": [p.id for p in skills_file.people],
            "tool_ids": [t.id for t in skills_file.tools],
            "access_path_ids": [ap.id for ap in skills_file.access_paths],
            "process_ids": [pr.id for pr in skills_file.processes],
            "ticket_type_ids": [tt.id for tt in skills_file.ticket_types],
            "glossary_ids": [g.id for g in skills_file.glossary],
            "include_all_informal_rules": True,
            "reasoning": f"Graph small ({total} entities) — passed wholesale.",
        }

    summary = skills_file.to_router_summary()
    user_msg = (
        f"<query>\n{query}\n</query>\n\n"
        f"<skills_file_summary>\n{json.dumps(summary, ensure_ascii=False, indent=2)}\n</skills_file_summary>\n\n"
        f"Seleccioná hasta {max_entities} ids relevantes para la pregunta."
    )

    message = call_with_retry(
        model=settings.model_router,
        max_tokens=2000,
        system=ROUTER_SYSTEM,
        tools=[ROUTE_ENTITIES_TOOL],
        tool_choice={"type": "tool", "name": "route_entities"},
        messages=[{"role": "user", "content": user_msg}],
    )
    selected = extract_tool_use(message, "route_entities")
    log.info(
        "router.selected",
        people=len(selected.get("people_ids", [])),
        tools=len(selected.get("tool_ids", [])),
        access_paths=len(selected.get("access_path_ids", [])),
        all_rules=selected.get("include_all_informal_rules"),
    )
    return selected


def build_sub_skills_file(
    skills_file: SkillsFile, selection: dict[str, Any]
) -> dict[str, Any]:
    """Construct a JSON-serializable sub-graph the Q&A agent will see."""
    pids = set(selection.get("people_ids", []))
    tids = set(selection.get("tool_ids", []))
    apids = set(selection.get("access_path_ids", []))
    prids = set(selection.get("process_ids", []))
    ttids = set(selection.get("ticket_type_ids", []))
    gids = set(selection.get("glossary_ids", []))
    include_all_rules = bool(selection.get("include_all_informal_rules"))

    people = [p for p in skills_file.people if p.id in pids]
    # Always include the manager + top_collaborators of selected people, transitively (1 hop)
    extra_pids = set()
    for p in people:
        if p.manager_id:
            extra_pids.add(p.manager_id)
        for c in p.top_collaborators:
            extra_pids.add(c)
    for p in skills_file.people:
        if p.id in extra_pids and p.id not in pids:
            people.append(p)

    tools = [t for t in skills_file.tools if t.id in tids]
    access_paths = [ap for ap in skills_file.access_paths if ap.id in apids]
    # If we selected a tool, also include its access_path even if router missed it
    for t in tools:
        if t.access_path_id and not any(ap.id == t.access_path_id for ap in access_paths):
            ap = next((a for a in skills_file.access_paths if a.id == t.access_path_id), None)
            if ap:
                access_paths.append(ap)
    processes = [pr for pr in skills_file.processes if pr.id in prids]
    ticket_types = [tt for tt in skills_file.ticket_types if tt.id in ttids]
    glossary = [g for g in skills_file.glossary if g.id in gids]
    informal_rules = (
        [r for r in skills_file.informal_rules]
        if include_all_rules
        else []
    )

    # Include relationships where both endpoints are in our sub-graph
    selected_ids = (
        {p.id for p in people}
        | {t.id for t in tools}
        | {ap.id for ap in access_paths}
        | {pr.id for pr in processes}
        | {tt.id for tt in ticket_types}
        | {g.id for g in glossary}
        | {r.id for r in informal_rules}
    )
    relationships = [
        r
        for r in skills_file.relationships
        if r.source_id in selected_ids and r.target_id in selected_ids
    ]

    return {
        "organization_name": skills_file.organization_name,
        "people": [p.model_dump(mode="json") for p in people],
        "tools": [t.model_dump(mode="json") for t in tools],
        "access_paths": [ap.model_dump(mode="json") for ap in access_paths],
        "processes": [pr.model_dump(mode="json") for pr in processes],
        "ticket_types": [tt.model_dump(mode="json") for tt in ticket_types],
        "glossary": [g.model_dump(mode="json") for g in glossary],
        "informal_rules": [r.model_dump(mode="json") for r in informal_rules],
        "relationships": [r.model_dump(mode="json") for r in relationships],
    }
