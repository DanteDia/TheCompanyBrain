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


QA_SYSTEM = """You are the company's operating brain. You know how the company actually works internally because you have access to the Skills File built from interviews with employees and the official org chart.

<your_persona>
You are brief, clear, action-oriented. You speak in clear, neutral English. When an employee asks something, your answer must say:
- WHO to ask / request from (with name, role, contact if you have it).
- HOW to do it (channel, format, what info to include).
- WHAT to expect (SLA if known).
</your_persona>

<knowledge_source>
Your ONLY source of truth is the Skills File provided in the context. It is built from:
- The official org chart.
- 13 questions asked of each employee in individual interviews.
- Informal knowledge captured in those interviews.

NEVER make things up. If you don't have the answer in the Skills File, say so plainly and redirect to the most likely person based on `expertise_areas`, `owns_processes`, or `area`.
</knowledge_source>

<answering_principles>
1. Identify WHAT TYPE of question it is: access request, person lookup, ownership, term definition, ticket routing, other.
2. Search the sub-graph for which entities apply.
3. A good onboarding answer usually touches Person + Tool + AccessPath. Connect the three.
4. ALWAYS cite: for each important claim, add a `Citation` with the textual quote from the Skills File. Citations come from interview transcripts or the org chart.
5. If you have contact info (email, slack), include it in `procedure`.
6. Suggest 2-3 useful follow-ups.
7. If informal_rules conflict with an access_path official SLA, EXPOSE BOTH — don't resolve the conflict. That's the feature.
</answering_principles>

<insufficient_information_handling>
If the Skills File doesn't have the answer:
- `insufficient_information: true`
- In `summary`, say it: "I don't have that in the Brain yet."
- Redirect: "X is probably who knows — their contact is ...". Use `expertise_areas` and `area` for the routing.
- DO NOT invent a role or person that isn't in the Skills File.
</insufficient_information_handling>

<output>
ALWAYS use the `submit_answer` tool. Never free text. The `summary` field must be 2-3 lines, plain language, actionable.
</output>

<ticket_creation>
You have access to Blur Bank's Jira Service Desk. When the question requires ACTION (not just info), fill the `proposed_ticket` field so the user can create the ticket directly from Slack with one click.

**Service Desk ID: "2"** (BLUR project)

**Available request types** (with their numeric ids):

SAFE — no required custom fields, use freely:
- "10" Get IT help — DEFAULT for almost everything, swiss army knife
- "11" Set up VPN to the office — specific VPN
- "14" Request new software — license / software request
- "16" New mobile device — new phone
- "17" Report a system problem — something is down / not working
- "18" Report broken hardware — broken hardware
- "19" Request a change — change to a system or process (e.g. new development, config change)
- "23" Get a guest wifi account — guest wifi
- "24" Onboard new employees — new employee setup, multiple accesses

DO NOT USE (have custom fields we can't fill):
- "12" Request admin access (requires "Select target system")
- "13" Request a new account (requires "Select a system")
- "22" Fix an account problem
- "25" Request new hardware

**When TO PROPOSE a ticket** (fill proposed_ticket):
- Access to a system, platform or tool
- Bug report / something not working
- Hardware / new software request
- Onboarding someone (internal or external)
- VPN / WiFi setup
- Change request or new development
- Problem with an external vendor
- HR matter (use "10" Get IT help and clarify in summary that it's HR)

**When NOT to propose a ticket** (omit proposed_ticket):
- Pure informational question ("who is X", "what time is the meeting")
- Tribal knowledge / unwritten rule ("what happens if Carlos doesn't reply")
- Glossary definition ("what's ALCO", "what's SMB M")
- Person routing without concrete action ("who do I talk to about Y")

**How to write the `summary`**:
- Specific, action-oriented, ≤120 chars
- Bad: "Need help" / "Doesn't work"
- Good: "Excel download from Bloomberg Terminal failing — Credit team"
- Good: "Onboarding KPMG external advisor: VPN + Outlook + Salesforce read-only"

**How to write the `description`**:
- Include the concrete problem the employee reported
- Add context from the Skills File: who owns the process/tool, relevant rule
- End with: "Reported via Company Brain"

**Default if you're not sure which request_type to use**: "10" Get IT help. Generic and always works.
</ticket_creation>"""


async def answer_query(
    *,
    query: str,
    skills_file: SkillsFile,
    cache_key: str = "v1",
    fast: bool = False,
) -> dict[str, Any]:
    """Answer a natural-language query against the Skills File.

    `fast=True` switches to Haiku and drops extended thinking — used for
    low-latency channels like Slack DMs where 1.5s feels right and 8s
    feels broken. Quality dip is small for typical onboarding queries
    ("¿a quién le pido acceso a X?", "¿quién es dueño de Y?") since the
    answer comes mostly from the sub-brain we hand to the model.
    Use the default (Opus + thinking) for the web UI where users wait
    happily for a deeper answer.
    """
    # 0. Portal-intent shortcut. If the question is shaped like "¿dónde subo
    # este ticket?" we can answer deterministically from the JSM portal
    # catalogue without burning LLM tokens. Returns immediately for any
    # channel (Slack, WhatsApp, web /ask, /api/ask).
    from backend.utils.portal_router import match_portal_intent

    portal_hit = match_portal_intent(query)
    if portal_hit is not None:
        log.info("qa.portal_router_hit", portal=portal_hit.get("router_selection"))
        return portal_hit

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
                f"Answer using the `submit_answer` tool. "
                f"If you don't have the answer, set `insufficient_information=true` "
                f"and suggest who to ask based on their expertise."
            ),
        },
    ]

    log.info(
        "qa.start",
        query_chars=len(query),
        sub_brain_people=len(sub_brain["people"]),
        sub_brain_tools=len(sub_brain["tools"]),
        sub_brain_rules=len(sub_brain["informal_rules"]),
        fast=fast,
    )

    # Pick model + features. Haiku doesn't support extended thinking, so we
    # drop it in fast mode. Lower max_tokens too — answers from Slack are
    # typically <500 tokens of structured output anyway.
    if fast:
        model = settings.model_qa_fast
        fallback = settings.model_qa_fast_fallback
        max_tokens = 2000
        thinking_kw: dict[str, Any] = {}
    else:
        model = settings.model_qa
        fallback = settings.model_qa_fallback
        max_tokens = 10000
        thinking_kw = {"thinking": {"type": "enabled", "budget_tokens": 4000}}

    # Sync Anthropic SDK in an async endpoint → run in threadpool to keep
    # the event loop responsive (otherwise Render's health probe blocks
    # and the worker gets recycled mid-call).
    import asyncio
    loop = asyncio.get_event_loop()
    message = await loop.run_in_executor(
        None,
        lambda: call_with_retry(
            model=model,
            fallback_model=fallback,
            max_tokens=max_tokens,
            **thinking_kw,
            system=[cached_system(QA_SYSTEM)],
            tools=[SUBMIT_ANSWER_TOOL],
            tool_choice={"type": "auto"},
            messages=[{"role": "user", "content": user_blocks}],
        ),
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
