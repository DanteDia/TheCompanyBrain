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


POST_INTERVIEW_SYSTEM = """Sos un analista que recibe el transcript de una entrevista a un empleado y extrae el conocimiento estructurado.

<input>
Vas a recibir:
1. Un transcript con turns (speaker, text, timestamp_seconds en segundos)
2. La info que ya teniamos del empleado (id, nombre, rol, area del org chart)
3. Las 13 preguntas que se hicieron, en orden

Cada turn del entrevistador (speaker=agent) hace UNA pregunta. Cada turn del empleado (speaker=employee) responde a la pregunta mas reciente del entrevistador.
</input>

<extraction_targets>
Extrae y registrá usando el tool `extract_from_interview`:

1. **people**: personas mencionadas (companeros, manager, reportes, terceros). Si tienen rol/area inferible, incluilo. Si solo dijo nombre, registralo igual con campos vacios — el merge despues lo matchea contra el org chart.
2. **tools**: sistemas, software, plataformas, repos. Cada uno con purpose breve.
3. **access_paths**: "para X, le pido a Y" → AccessPath. CRITICAL para el Trojan Horse — esta es la pregunta 7. Captura SLA si lo menciono.
4. **processes**: procesos o flujos mencionados, con owner si se infiere.
5. **ticket_types**: "me llegan pedidos de X de gente de Y".
6. **glossary**: terminos internos con su definicion (pregunta 12).
7. **informal_rules**: TODO lo que el empleado dijo en la pregunta 11 (conocimiento no escrito), MAS cualquier cosa similar que aparezca en otras respuestas. Se generoso aca — false positives son aceptables.
8. **relationships**: edges entre entidades. "X y yo trabajamos juntos en Y" → Relationship.
9. **knowledge_gaps**: temas que el empleado mencionó pero no profundizó.

Cada extracción incluye un `evidence` array con:
- source_type: "interview"
- source_id: el call_id que te paso
- speaker: quién lo dijo (típicamente "employee", a veces "agent" si fue interpretacion)
- timestamp_seconds: cuando
- quote: la frase literal (≤30 palabras)
</extraction_targets>

<id_conventions>
- Usá snake_case para todos los ids: "ana_lopez", "salesforce_creditos", "alta_usuario_sistemas".
- Si la persona ya viene en el employee skeleton (te lo paso en el input), USA ESE id, no inventes uno nuevo.
- Para Tools, usá un id descriptivo del producto, no de la marca (ej: "salesforce_creditos" no "sf").
- Para AccessPath, el id es target_tool_id + "_access" (ej: "salesforce_creditos_access").
</id_conventions>

<rules>
- Si el empleado mencionó un nombre sin apellido o rol, registralo como Person con `name` lo que dijo y dejá los otros campos vacíos. El merge despues hace el matching.
- NO inventes información. Si no se dijo, no se incluye.
- En reglas informales sé generoso — incluso menciones de pasada. Mejor false positive que perder señal.
- Las relationships se INFIEREN del transcript, pero solo cuando hay evidencia clara. No inventes vinculos.
- knowledge_gaps NO son cosas que el agente preguntó y el empleado no respondió — son temas que el empleado tocó pero dejó incompletos.
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
        "Extraé todo el conocimiento usando el tool `extract_from_interview`. "
        "Cada item con su evidence."
    )

    log.info(
        "post_interview.start",
        call_id=call_id,
        employee_id=employee_skeleton.get("id"),
        transcript_turns=len(transcript),
    )

    # Anthropic constraint: extended thinking is incompatible with forced
    # tool_choice. Extraction is a structured pass — we don't need thinking,
    # we need a clean tool call. So: force the tool, no thinking.
    # max_tokens 6000 keeps each call <30s — fits in Render request window
    # and reduces tail latency that triggers worker recycles on starter plan.
    message = call_with_retry(
        model=settings.model_extractor,
        fallback_model=settings.model_qa_fallback,
        max_tokens=6000,
        system=[cached_system(POST_INTERVIEW_SYSTEM)],
        tools=[EXTRACT_FROM_INTERVIEW_TOOL],
        tool_choice={"type": "tool", "name": "extract_from_interview"},
        messages=[{"role": "user", "content": user_msg}],
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
