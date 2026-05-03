"""Interview agent — Retell.ai setup + outbound call orchestration.

Two responsibilities:
    1. create_or_update_agent: register the Brain interviewer agent in Retell
       with the 13-question system prompt + Claude Sonnet as the LLM.
    2. initiate_phone_call: trigger an outbound call from our Twilio AR number
       to a target employee. Retell handles real-time STT/TTS + turn-taking.

The Retell webhook (defined in main.py) receives `call_ended` events with the
final transcript and dispatches to post_interview.process_interview.
"""

from __future__ import annotations

from typing import Any, Optional

import httpx
import structlog

from backend.agents.interview_questions import questions_block_for_prompt
from backend.config import settings

log = structlog.get_logger("interview_agent")

RETELL_BASE = "https://api.retellai.com/v2"


INTERVIEW_SYSTEM_PROMPT = """Sos un entrevistador del proyecto Company Brain. Tu trabajo es entrevistar a un empleado durante 5-10 minutos para entender como trabaja en su empresa.

<your_persona>
Sos calido, breve, profesional. No usas jerga corporativa. Hablas en español rioplatense neutro. Te llamas "Brain" — un asistente que esta aprendiendo de la empresa.
</your_persona>

<conversation_flow>
1. Saludas brevemente. "Hola {nombre}, soy Brain. Gracias por darme estos minutos. Te voy a hacer trece preguntas cortas para entender como trabajas. La idea es que en siete minutos pueda armar un mapa de como funciona el equipo. Arrancamos?"

2. Despues de cada respuesta, haces ACK breve y pasas a la proxima ("Buenisimo. Siguiente:")

3. Si el empleado se va por las ramas, lo traes con cuidado: "Eso es interesante — para no pasarme del tiempo, te llevo a la proxima."

4. Si no entendes algo, una repregunta maxima. No mas.

5. Al final agradeces y cerras: "Listo, ya esta. Gracias {nombre}, esto suma muchisimo."
</conversation_flow>

<rules>
- NO inventas respuestas si el empleado dijo algo confuso. Mejor repreguntá UNA vez, y si sigue confuso, pasás a la próxima y el equipo de Brain lo procesa después.
- NO presionas. Si no quiere responder algo, esta bien. Pasas.
- NO te extiendas. La meta es 7 minutos totales. Si vas atrasado, recortas los ACKs.
</rules>

<questions>
{questions_block}
</questions>

Hace las preguntas EN ORDEN. No saltees. Despues de la ultima (q13_open), cerras la entrevista."""


def _system_prompt_for_employee(name: str) -> str:
    block = questions_block_for_prompt()
    prompt = INTERVIEW_SYSTEM_PROMPT.replace("{questions_block}", block)
    prompt = prompt.replace("{nombre}", name.split()[0] if name else "")
    return prompt


def _client() -> httpx.Client:
    if not settings.retell_api_key:
        raise RuntimeError("RETELL_API_KEY not set.")
    return httpx.Client(
        base_url=RETELL_BASE,
        headers={
            "Authorization": f"Bearer {settings.retell_api_key}",
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )


def create_or_update_agent(employee_name: str) -> dict[str, Any]:
    """Register / update a Retell agent personalized for one employee.

    For V1 we create a generic "brain-interviewer" agent once and reuse it.
    The {nombre} placeholder gets injected as a per-call dynamic variable
    via Retell's "dynamic_variables" feature when initiating the call.
    """
    payload = {
        "agent_name": "brain-interviewer",
        "voice_id": "11labs-Adrian",
        "language": "es-ES",
        "response_engine": {
            "type": "retell-llm",
            "llm_id": settings.model_interview,
            "system_prompt": _system_prompt_for_employee(employee_name),
            "begin_message": (
                f"Hola {employee_name.split()[0] if employee_name else ''}, soy Brain. "
                f"Tenes un par de minutos?"
            ),
        },
    }
    with _client() as c:
        if settings.retell_agent_id:
            r = c.patch(f"/update-agent/{settings.retell_agent_id}", json=payload)
        else:
            r = c.post("/create-agent", json=payload)
    r.raise_for_status()
    data = r.json()
    log.info("retell.agent_upserted", agent_id=data.get("agent_id"))
    return data


def initiate_phone_call(
    *,
    agent_id: str,
    to_number: str,
    employee_id: str,
    employee_name: str,
    employee_role: str = "",
    employee_area: str = "",
) -> dict[str, Any]:
    """Trigger an outbound call. Retell + Twilio handle the rest."""
    payload = {
        "agent_id": agent_id,
        "from_number": settings.twilio_from_number,
        "to_number": to_number,
        "metadata": {
            "employee_id": employee_id,
            "employee_name": employee_name,
            "organization_id": settings.default_org_id,
        },
        "retell_llm_dynamic_variables": {
            "nombre": employee_name.split()[0] if employee_name else "",
            "rol": employee_role or "empleado",
            "area": employee_area or "su area",
        },
    }
    with _client() as c:
        r = c.post("/create-phone-call", json=payload)
    r.raise_for_status()
    data = r.json()
    log.info(
        "retell.call_initiated",
        call_id=data.get("call_id"),
        employee_id=employee_id,
        to_number=to_number,
    )
    return data


def initiate_web_call(
    *,
    agent_id: str,
    employee_id: str,
    employee_name: str,
    employee_role: str = "",
    employee_area: str = "",
) -> dict[str, Any]:
    """Create a web-call (browser-based) — for testing without Twilio."""
    payload = {
        "agent_id": agent_id,
        "metadata": {
            "employee_id": employee_id,
            "employee_name": employee_name,
            "organization_id": settings.default_org_id,
        },
        "retell_llm_dynamic_variables": {
            "nombre": employee_name.split()[0] if employee_name else "",
            "rol": employee_role or "empleado",
            "area": employee_area or "su area",
        },
    }
    with _client() as c:
        r = c.post("/create-web-call", json=payload)
    r.raise_for_status()
    data = r.json()
    log.info("retell.web_call_initiated", call_id=data.get("call_id"))
    return data


def get_call(call_id: str) -> Optional[dict[str, Any]]:
    with _client() as c:
        r = c.get(f"/get-call/{call_id}")
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()
