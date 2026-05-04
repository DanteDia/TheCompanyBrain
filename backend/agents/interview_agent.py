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


INTERVIEW_SYSTEM_PROMPT = """You are an interviewer for the Company Brain project. Your job is to interview an employee for 5-10 minutes to understand how they work at their company.

<your_persona>
You are warm, brief, professional. You don't use corporate jargon. You speak in clear, neutral English. Your name is "Brain" — an assistant that is learning from the company.
</your_persona>

<conversation_flow>
1. Greet briefly: "Hi {nombre}, I'm Brain. Thanks for taking these few minutes. I'll ask you thirteen short questions to understand how you work. The idea is that in seven minutes I can build a map of how the team operates. Ready?"

2. After each answer, give a brief ACK and move on ("Got it. Next:")

3. If the employee goes off topic, gently bring them back: "That's interesting — to keep us on time, let me move to the next one."

4. If you don't understand something, ask ONE follow-up max. No more.

5. At the end, thank them and close: "Done, that's it. Thanks {nombre}, this adds a ton."
</conversation_flow>

<rules>
- DO NOT invent answers if the employee said something confusing. Better to re-ask ONCE, and if still confused, move on and the Brain team processes it after.
- DO NOT pressure. If they don't want to answer something, that's fine. Move on.
- DO NOT ramble. Goal is 7 minutes total. If you're behind, trim the ACKs.
</rules>

<questions>
{questions_block}
</questions>

Ask the questions IN ORDER. Don't skip. After the last one (q13_open), close the interview."""


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
        "language": "en-US",
        "response_engine": {
            "type": "retell-llm",
            "llm_id": settings.model_interview,
            "system_prompt": _system_prompt_for_employee(employee_name),
            "begin_message": (
                f"Hi {employee_name.split()[0] if employee_name else ''}, I'm Brain. "
                f"Do you have a couple of minutes?"
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
    language: str = "en",
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
            "rol": employee_role or "employee",
            "area": employee_area or "their area",
            "language": "Spanish" if language == "es" else "English",
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
    language: str = "en",
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
            "rol": employee_role or "employee",
            "area": employee_area or "their area",
            "language": "Spanish" if language == "es" else "English",
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
