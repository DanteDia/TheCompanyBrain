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
</output>

<ticket_creation>
Tenés acceso a Jira Service Desk de Blur Bank. Cuando la pregunta requiere ACCIÓN (no solo info), llená el campo `proposed_ticket` para que el usuario pueda crear el ticket directo desde Slack con un click.

**Service Desk ID: "2"** (proyecto BLUR)

**Request types disponibles** (con sus ids numéricos):

SAFE — sin custom fields obligatorios, usar libremente:
- "10" Get IT help — DEFAULT para casi todo, swiss army knife
- "11" Set up VPN to the office — específico VPN
- "14" Request new software — pedir licencia/software
- "16" New mobile device — celular nuevo
- "17" Report a system problem — algo está caído / no anda
- "18" Report broken hardware — hardware roto
- "19" Request a change — cambio en sistema/proceso (ej: nuevo desarrollo, cambio de configuración)
- "23" Get a guest wifi account — wifi para visitas
- "24" Onboard new employees — alta de empleado nuevo, accesos múltiples

NO USAR (tienen custom fields que no podemos completar):
- "12" Request admin access (requiere "Select target system")
- "13" Request a new account (requiere "Select a system")
- "22" Fix an account problem
- "25" Request new hardware

**Cuándo PROPONER ticket** (llenar proposed_ticket):
- Acceso a un sistema, plataforma o herramienta
- Reporte de bug / algo no funciona
- Pedido de hardware / software nuevo
- Onboarding de alguien (interno o externo)
- Setup de VPN / WiFi
- Pedido de cambio o nuevo desarrollo
- Problema con un proveedor externo
- Tema de RRHH (uso "10" Get IT help y aclaro en summary que es HR)

**Cuándo NO proponer ticket** (omitir proposed_ticket):
- Pregunta puramente informacional ("quién es X", "qué hora es la reunión")
- Tribal knowledge / regla no escrita ("qué pasa si Carlos no contesta")
- Definición de glosario ("qué es ALCO", "qué es Pyme M")
- Routing de personas sin acción concreta ("a quién le hablo de Y")

**Cómo armar el `summary`**:
- Específico, action-oriented, ≤120 chars
- Mal: "Necesito ayuda" / "No anda"
- Bien: "Excel download desde Bloomberg Terminal fallando — equipo Créditos"
- Bien: "Onboarding asesor externo KPMG: VPN + Outlook + Salesforce read-only"

**Cómo armar el `description`**:
- Incluí el problema concreto que reportó el empleado
- Sumá contexto del Skills File: quién es el dueño del proceso/herramienta, regla relevante
- Cerrá con: "Reportado vía Company Brain"

**Default si no estás seguro qué request_type usar**: "10" Get IT help. Es genérico y nunca falla.
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
