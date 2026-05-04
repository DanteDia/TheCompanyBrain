"""Post-interview agent: transcript → structured entities → Skills File.

This is the most expensive call in the pipeline. We use:
    - Opus 4.7 with extended thinking (4000 token budget)
    - Forced tool use (tool_choice: extract_from_interview)
    - Prompt caching on the system block
    - 12k max output tokens to fit large extractions

Inputs:
    - The interview transcript (canonical format)
    - The employee skeleton (id, name, role, area from org chart)
    - The 13 questions, so the model knows what each turn is responding to

Output: structured extraction merged into the Skills File.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

import structlog

from backend.agents.interview_questions import questions_block_for_prompt
from backend.config import settings
from backend.models.schemas import (
    AccessPath,
    EvidenceSpan,
    GlossaryTerm,
    InformalRule,
    Person,
    Process,
    Relationship,
    SkillsFile,
    TicketType,
    Tool,
)
from backend.tools.schemas import EXTRACT_FROM_INTERVIEW_TOOL
from backend.utils.claude_client import (
    cached_system,
    call_with_retry,
    extract_thinking,
    extract_tool_use,
)
from backend.utils.merge import merge_extraction_into_skills_file
from backend.utils.transcript_loader import format_transcript_for_llm

log = structlog.get_logger("post_interview")


POST_INTERVIEW_SYSTEM = """You are an analyst who receives the transcript of an interview with an employee and extracts structured knowledge.

<input>
You will receive:
1. A transcript with turns (speaker, text, timestamp_seconds in seconds)
2. Info we already had about the employee (id, name, role, area from the org chart)
3. The 13 questions that were asked, in order

Each interviewer turn (speaker=agent) asks ONE question. Each employee turn (speaker=employee) answers the most recent interviewer question.
</input>

<extraction_targets>
Extract and record using the `extract_from_interview` tool:

1. **people**: people mentioned (colleagues, manager, reports, third parties). If you can infer role/area, include it. If only a name was given, record it anyway with empty fields — the merge will match it against the org chart later.
2. **tools**: systems, software, platforms, repos. Each with a brief purpose.
3. **access_paths**: "for X, I ask Y" → AccessPath. CRITICAL for the Trojan Horse — this is question 7. Capture SLA if mentioned.
4. **processes**: processes or workflows mentioned, with owner if inferable.
5. **ticket_types**: "I get requests for X from people in Y".
6. **glossary**: internal terms with their definition (question 12).
7. **informal_rules**: EVERYTHING the employee said in question 11 (unwritten knowledge), PLUS anything similar that comes up in other answers. Be generous here — false positives are acceptable.
8. **relationships**: edges between entities. "X and I work together on Y" → Relationship.
9. **knowledge_gaps**: topics the employee mentioned but didn't expand on.

Each extraction includes an `evidence` array with:
- source_type: "interview"
- source_id: the call_id passed in
- speaker: who said it (typically "employee", sometimes "agent" if it was an interpretation)
- timestamp_seconds: when
- quote: the literal phrase (≤30 words)
</extraction_targets>

<id_conventions>
- Use snake_case for all ids: "ana_lopez", "salesforce_credits", "user_provisioning_systems".
- If the person already comes in the employee skeleton (passed in input), USE THAT id, don't invent a new one.
- For Tools, use a descriptive product id, not the brand (e.g. "salesforce_credits" not "sf").
- For AccessPath, the id is target_tool_id + "_access" (e.g. "salesforce_credits_access").
</id_conventions>

<rules>
- If the employee mentioned a name without surname or role, record it as Person with `name` set to what they said and leave other fields empty. The merge handles matching later.
- NEVER invent information. If it wasn't said, don't include it.
- For informal rules, be generous — even passing mentions. Better a false positive than losing signal.
- Relationships are INFERRED from the transcript, but only when there's clear evidence. Don't invent connections.
- knowledge_gaps are NOT things the agent asked that the employee didn't answer — they're topics the employee touched on but left incomplete.
</rules>"""


async def process_interview(
    *,
    call_id: str,
    employee_skeleton: dict[str, Any],
    transcript: list[dict[str, Any]],
    skills_file: SkillsFile,
) -> dict[str, Any]:
    """Process one interview transcript and merge the extraction into skills_file.

    Returns the raw extraction dict (for debugging / admin review).
    Mutates `skills_file` in place via merge_extraction_into_skills_file.
    """
    transcript_text = format_transcript_for_llm(transcript)
    user_msg = (
        f"<employee>\n{json.dumps(employee_skeleton, ensure_ascii=False, indent=2)}\n</employee>\n\n"
        f"<questions>\n{questions_block_for_prompt()}\n</questions>\n\n"
        f'<transcript call_id="{call_id}">\n{transcript_text}\n</transcript>\n\n'
        "Extract all knowledge using the `extract_from_interview` tool. "
        "Each item with its evidence."
    )

    log.info(
        "post_interview.start",
        call_id=call_id,
        employee_id=employee_skeleton.get("id"),
        transcript_turns=len(transcript),
    )

    # Anthropic SDK is sync. Running it directly inside an async endpoint
    # blocks the event loop — Render then kills the worker because /health
    # probes time out. Wrap in run_in_executor to keep the loop responsive.
    import asyncio
    loop = asyncio.get_event_loop()
    message = await loop.run_in_executor(
        None,
        lambda: call_with_retry(
            model=settings.model_extractor,
            fallback_model=settings.model_qa_fallback,
            max_tokens=10000,
            system=[cached_system(POST_INTERVIEW_SYSTEM)],
            tools=[EXTRACT_FROM_INTERVIEW_TOOL],
            tool_choice={"type": "tool", "name": "extract_from_interview"},
            messages=[{"role": "user", "content": user_msg}],
        ),
    )

    extracted = extract_tool_use(message, "extract_from_interview")
    thinking = extract_thinking(message)

    log.info(
        "post_interview.extracted",
        call_id=call_id,
        people=len(extracted.get("people", [])),
        tools=len(extracted.get("tools", [])),
        access_paths=len(extracted.get("access_paths", [])),
        processes=len(extracted.get("processes", [])),
        informal_rules=len(extracted.get("informal_rules", [])),
        relationships=len(extracted.get("relationships", [])),
    )

    _merge_into_skills_file(extracted, skills_file)
    skills_file.coverage.interviewed += 1
    skills_file.generated_at = datetime.now(timezone.utc)

    # Mark the employee as interviewed
    target = skills_file.person(employee_skeleton.get("id", ""))
    if target:
        target.last_interviewed_at = datetime.now(timezone.utc)

    return {"extraction": extracted, "thinking": thinking}


def _merge_into_skills_file(extracted: dict[str, Any], skills: SkillsFile) -> None:
    """Convert raw extraction dict → Pydantic models → merge."""
    people = [_safe_model(Person, p) for p in extracted.get("people", [])]
    tools = [_safe_model(Tool, t) for t in extracted.get("tools", [])]
    access_paths = [_safe_model(AccessPath, ap) for ap in extracted.get("access_paths", [])]
    processes = [_safe_model(Process, p) for p in extracted.get("processes", [])]
    ticket_types = [_safe_model(TicketType, t) for t in extracted.get("ticket_types", [])]
    glossary = [_safe_model(GlossaryTerm, g) for g in extracted.get("glossary", [])]
    informal_rules = [
        _safe_model(InformalRule, r) for r in extracted.get("informal_rules", [])
    ]
    relationships = [_safe_model(Relationship, r) for r in extracted.get("relationships", [])]

    merge_extraction_into_skills_file(
        skills,
        people=[p for p in people if p],
        tools=[t for t in tools if t],
        access_paths=[ap for ap in access_paths if ap],
        processes=[p for p in processes if p],
        ticket_types=[t for t in ticket_types if t],
        glossary=[g for g in glossary if g],
        informal_rules=[r for r in informal_rules if r],
        relationships=[r for r in relationships if r],
        knowledge_gaps=extracted.get("knowledge_gaps", []),
    )


def _safe_model(cls: type, data: dict[str, Any]) -> Optional[Any]:
    """Don't crash the whole pipeline on one malformed entity."""
    try:
        return cls.model_validate(data)
    except Exception as exc:
        log.warning("post_interview.bad_entity", cls=cls.__name__, error=str(exc), data=data)
        return None
