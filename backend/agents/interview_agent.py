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
You are warm, brief, professional. You don't use corporate jargon. You speak in clear, natural {language} for the entire conversation — even if the questions block or other context is in English, every spoken word you produce must be in {language}. Your name is "Brain" — an assistant that is learning from the company.
</your_persona>

<conversation_flow>
1. Greet briefly IN {language}. Translate this template, do not output the English literal: "Hi {nombre}, I'm Brain. Thanks for taking these few minutes. I'll ask you thirteen short questions to understand how you work. The idea is that in about seven minutes I can build a map of how the team operates. Ready?"

2. After each answer, give a brief ACK and move on ("Got it. Next:")

3. If the employee goes off topic, gently bring them back: "That's interesting — to keep us on time, let me move to the next one."

4. If you don't understand something, ask ONE follow-up max. No more.

5. At the end, thank them and close IN {language}. Template: "Done, that's it. Thanks {nombre}, this adds a ton."
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


def _system_prompt_for_employee(name: str, language: str = "en") -> str:
    block = questions_block_for_prompt()
    prompt = INTERVIEW_SYSTEM_PROMPT.replace("{questions_block}", block)
    prompt = prompt.replace("{nombre}", name.split()[0] if name else "")
    # {language} placeholder — kept literal in the prompt so Retell's dynamic
    # variables can fill it per call. Keeping the {language} token here means
    # the LLM sees `Spanish` or `English` (the dynamic variable values) wherever
    # the prompt says "in {language}".
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
    """Register / update the Retell brain-interviewer.

    Retell's API treats the LLM (system prompt, model id, begin_message)
    and the Agent (voice + language + which LLM to use) as TWO objects.
    A single PATCH against /update-agent that includes response_engine
    fails because system_prompt lives on the LLM, not the agent.

    Flow:
      1. If the agent doesn't exist yet → create LLM + create Agent
         pointing at it. Persist both ids in env (manual step).
      2. If the agent exists → fetch it to discover its llm_id, PATCH
         the LLM with the new system_prompt + begin_message=null,
         then PATCH the agent with the new voice + language.
    """
    sys_prompt = _system_prompt_for_employee(employee_name)

    # Agent/LLM CRUD endpoints don't live under /v2 in the current Retell API
    # (only call-creation endpoints do). Build a sibling client at the root.
    def _root_client() -> httpx.Client:
        return httpx.Client(
            base_url="https://api.retellai.com",
            headers={
                "Authorization": f"Bearer {settings.retell_api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    if settings.retell_agent_id:
        with _root_client() as c:
            # Production already has a great multilingual + role-aware
            # general_prompt on the LLM. Don't clobber it — only PATCH
            # the agent itself to switch STT/TTS to multi-language with
            # a multilingual voice.
            agent_patch = {
                "voice_id": "11labs-Adrian",
                "language": "multi",
            }
            r = c.patch(f"/update-agent/{settings.retell_agent_id}", json=agent_patch)
            r.raise_for_status()
            data = r.json()
            log.info(
                "retell.agent_language_patched",
                agent_id=data.get("agent_id"),
                language=data.get("language"),
                voice_id=data.get("voice_id"),
            )
            return data

    # No existing agent — create LLM first, then agent pointing at it.
    with _root_client() as c:
        llm_create = {
            "model": "claude-sonnet-4",
            "general_prompt": sys_prompt,
            "begin_message": "",
        }
        lr = c.post("/create-retell-llm", json=llm_create)
        lr.raise_for_status()
        llm_id = lr.json().get("llm_id")

        agent_create = {
            "agent_name": "brain-interviewer",
            "voice_id": "11labs-Adrian",
            "language": "multi",
            "response_engine": {"type": "retell-llm", "llm_id": llm_id},
        }
        r = c.post("/create-agent", json=agent_create)
        r.raise_for_status()
        data = r.json()
        log.info("retell.agent_created", agent_id=data.get("agent_id"), llm_id=llm_id)
        return data


def _set_agent_language(language: str) -> dict[str, Any]:
    """PATCH the live Retell agent so its STT/TTS pipeline matches the
    request language. Returns the patched agent (or error detail).
    """
    if not settings.retell_agent_id:
        return {"skipped": True}
    code = "es-419" if language == "es" else "en-US"
    # 11labs-Cimo was the original voice for this agent and is known to
    # work in Retell. Pin it consistently across languages so the agent
    # identity stays the same regardless of language.
    payload = {"language": code, "voice_id": "11labs-Cimo"}
    with httpx.Client(
        base_url="https://api.retellai.com",
        headers={
            "Authorization": f"Bearer {settings.retell_api_key}",
            "Content-Type": "application/json",
        },
        timeout=15.0,
    ) as c:
        r = c.patch(f"/update-agent/{settings.retell_agent_id}", json=payload)
        if r.status_code >= 400:
            log.warning(
                "retell.agent_language_patch_failed",
                status=r.status_code,
                body=r.text[:500],
                payload=payload,
            )
            # Don't raise — we still want the call to proceed even if the
            # language patch fails. But return the error detail so the
            # debug endpoint can surface it.
            return {"ok": False, "status": r.status_code, "body": r.text[:500], "payload": payload}
        log.info("retell.agent_language_set", language=code)
        return {"ok": True, "patched": r.json(), "payload": payload}


def initiate_phone_call(
    *,
    agent_id: str,
    to_number: str,
    employee_id: str,
    employee_name: str,
    employee_role: str = "",
    employee_area: str = "",
    language: str = "en",
    demo: bool = False,
) -> dict[str, Any]:
    """Trigger an outbound call. Retell + Twilio handle the rest."""
    _set_agent_language(language)
    payload = {
        "agent_id": agent_id,
        "from_number": settings.twilio_from_number,
        "to_number": to_number,
        "metadata": {
            "employee_id": employee_id,
            "employee_name": employee_name,
            "organization_id": settings.default_org_id,
            "demo": demo,
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
    demo: bool = False,
) -> dict[str, Any]:
    """Create a web-call (browser-based) — for testing without Twilio."""
    _set_agent_language(language)
    payload = {
        "agent_id": agent_id,
        "metadata": {
            "employee_id": employee_id,
            "employee_name": employee_name,
            "organization_id": settings.default_org_id,
            "demo": demo,
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
