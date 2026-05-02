"""Q&A agent: the Trojan Horse. Answers an employee query using the Skills File.

Pipeline:
    query
      → router (Haiku) selects relevant entity ids
      → build_sub_skills_file (the sub-graph)
      → qa_agent (Opus + extended thinking + caching)
      → Answer (structured via submit_answer tool)

Caching:
    - System prompt: cached (identical across all queries)
    - Sub-skills-file: cached (rebuilt on every query, but each query usually
      hits a similar slice — the cache key changes when the slice changes)
"""

from __future__ import annotations

import json
from typing import Any

import structlog

from backend.agents.router import build_sub_skills_file, route_entities
from backend.config import settings
from backend.models.schemas import SkillsFile
from backend.tools.schemas import SUBMIT_ANSWER_TOOL
from backend.utils.claude_client import (
    cached_system,
    cached_text_block,
    call_with_retry,
    extract_thinking,
    extract_tool_use,
)

log = structlog.get_logger("qa_agent")


QA_SYSTEM = """Sos el cerebro operativo de la empresa. Sabes como funciona internamente porque tenes acceso al Skills File construido a partir de entrevistas con empleados y el organigrama oficial.

<your_persona>
Sos breve, claro, accionable. Hablas en español rioplatense neutro. Cuando un empleado pregunta algo, tu respuesta tiene que decir:
- A QUIEN preguntar / pedir (con nombre, rol, contacto si lo tenes).
- COMO hacerlo (canal, formato, qué información incluir).
- QUE esperar (SLA si lo sabes).
</your_persona>

<knowledge_source>
Tu UNICA fuente de verdad es el Skills File que viene en el contexto. Está construido a partir de:
- El organigrama oficial (org_chart).
- 13 preguntas hechas a cada empleado en entrevistas individuales.
- Conocimiento informal capturado en esas entrevistas.

NUNCA inventes. Si no tenes la respuesta en el Skills File, decilo claramente y redirí a la persona más probable basándote en `expertise_areas`, `owns_processes`, o `area`.
</knowledge_source>

<answering_principles>
1. Identifica QUE TIPO de pregunta es: pedido de acceso, lookup de persona, ownership, definición de término, ticket routing, otra.
2. Buscá en el sub-grafo qué entidades aplican.
3. Una buena respuesta de onboarding suele tocar Person + Tool + AccessPath. Conectá los tres.
4. Citá SIEMPRE: por cada afirmación importante, agregá un `Citation` con el quote textual del Skills File. Las citations vienen del transcript de entrevistas o del org chart.
5. Si tenés contacto (email, slack), incluilo en `procedure`.
6. Sugerí 2-3 follow-ups útiles.
7. Si hay informal_rules en conflicto con un access_path SLA oficial, EXPONÉ AMBOS — no resuelvas el conflicto. Esa es la feature.
</answering_principles>

<insufficient_information_handling>
Si el Skills File no tiene la respuesta:
- `insufficient_information: true`
- En `summary`, decilo: "No tengo eso en el Brain todavía."
- Redirige: "X es probablemente quien sabe — su contacto es ...". Usá `expertise_areas` y `area` para hacer el routing.
- NO INVENTES UN ROL O PERSONA QUE NO ESTÁ EN EL SKILLS FILE.
</insufficient_information_handling>

<output>
Usás SIEMPRE el tool `submit_answer`. Nunca texto libre. El field `summary` debe ser de 2-3 líneas, plain language, accionable.
</output>"""


async def answer_query(
    *,
    query: str,
    skills_file: SkillsFile,
    cache_key: str = "v1",
) -> dict[str, Any]:
    """Answer a natural-language query against the Skills File."""
    selection = await route_entities(skills_file, query)
    sub_brain = build_sub_skills_file(skills_file, selection)

    user_blocks = [
        cached_text_block(
            f'<company_brain version="{cache_key}">\n'
            f"{json.dumps(sub_brain, ensure_ascii=False, indent=2)}\n"
            f"</company_brain>"
        ),
        {
            "type": "text",
            "text": (
                f"<query>\n{query}\n</query>\n\n"
                f"Respondé usando el tool `submit_answer`. "
                f"Si no tenes la respuesta, marcá `insufficient_information=true` "
                f"y sugerí a quien preguntar segun expertise."
            ),
        },
    ]

    log.info(
        "qa.start",
        query_chars=len(query),
        sub_brain_people=len(sub_brain["people"]),
        sub_brain_tools=len(sub_brain["tools"]),
        sub_brain_rules=len(sub_brain["informal_rules"]),
    )

    # Anthropic constraint: extended thinking is incompatible with forced
    # tool_choice. Q&A benefits a lot from thinking (it's the WOW in the UI),
    # so we keep thinking and use tool_choice="auto". The system prompt forces
    # the model to call submit_answer — Opus complies ~100% of the time.
    message = call_with_retry(
        model=settings.model_qa,
        fallback_model=settings.model_qa_fallback,
        max_tokens=10000,
        thinking={"type": "enabled", "budget_tokens": 4000},
        system=[cached_system(QA_SYSTEM)],
        tools=[SUBMIT_ANSWER_TOOL],
        tool_choice={"type": "auto"},
        messages=[{"role": "user", "content": user_blocks}],
    )

    answer = extract_tool_use(message, "submit_answer")
    thinking = extract_thinking(message)

    # Resolve person_to_contact_id → full Person dict for the frontend
    person = None
    pid = answer.get("person_to_contact_id")
    if pid:
        p = skills_file.person(pid)
        if p:
            person = p.model_dump(mode="json")

    log.info(
        "qa.answered",
        insufficient=answer.get("insufficient_information"),
        citations=len(answer.get("citations", [])),
        follow_ups=len(answer.get("follow_ups", [])),
        referenced=len(answer.get("referenced_entity_ids", [])),
    )

    return {
        **answer,
        "person_to_contact": person,
        "thinking_trace": thinking,
        "router_selection": selection,
    }
