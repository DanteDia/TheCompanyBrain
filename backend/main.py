"""FastAPI entry point — single backend serving:

  HTTP API (frontend):
    POST /api/upload-org-chart  — CSV upload → seed Skills File
    POST /api/build-brain       — process all sample/uploaded interviews
    POST /api/ask               — ask the Brain a query (JSON in/out)
    GET  /api/skills-file       — return the current Skills File
    GET  /api/interviews        — list interviews + status
    POST /api/schedule          — schedule interviews for all employees
    POST /api/call/initiate     — manually trigger a Retell call

  Channel webhooks:
    POST /retell/webhook        — Retell call lifecycle (call_ended → process)
    POST /channels/gchat/webhook — Google Chat events
    POST /channels/whatsapp/webhook — WhatsApp Cloud / Twilio events

  Health:
    GET  /health
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from io import StringIO
from typing import Any, Optional

from pathlib import Path

from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.agents.post_interview import process_interview
from backend.agents.qa_agent import answer_query
from backend.channels.gchat import GoogleChatChannel
from backend.channels.web import WebChannel
from backend.channels.slack import SlackChannel
from backend.channels.whatsapp import WhatsAppChannel
from backend.utils.jira_client import JiraNotConfiguredError, get_jira_client
from backend.config import settings
from backend.models.schemas import SkillsFile
from backend.utils.org_chart_loader import load_org_chart_from_text
from backend.utils.merge import merge_extraction_into_skills_file
from backend.utils.transcript_loader import normalize_retell_transcript

# ─── App + CORS ──────────────────────────────────────────────────────────────

app = FastAPI(title="Company Brain", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened post-MVP
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

WEB = WebChannel()
GCHAT = GoogleChatChannel()
SLACK = SlackChannel()
WHATSAPP = WhatsAppChannel()


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _supabase():
    """Imported lazily to allow scripts/eval to run without Supabase config."""
    from backend.utils import supabase_client

    return supabase_client


def _get_skills_file_or_404(org_id: str) -> SkillsFile:
    sf = _supabase().load_skills_file(org_id)
    if not sf:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No Skills File for org={org_id}. "
                f"Upload an org chart and process interviews first."
            ),
        )
    return sf


# ─── Health ──────────────────────────────────────────────────────────────────


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "version": "0.1.0",
        "environment": settings.environment,
        "models": {
            "qa": settings.model_qa,
            "extractor": settings.model_extractor,
            "interview": settings.model_interview,
            "router": settings.model_router,
        },
    }


# ─── Org chart upload ────────────────────────────────────────────────────────


@app.post("/api/upload-org-chart")
async def upload_org_chart(
    file: UploadFile = File(...),
    organization_id: str = Form(default_factory=lambda: settings.default_org_id),
    organization_name: str = Form(default="Blur Bank"),
) -> dict[str, Any]:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "expected a .csv file")
    text = (await file.read()).decode("utf-8")
    people = load_org_chart_from_text(text, source_id=file.filename)

    sf = _supabase().load_skills_file(organization_id) or SkillsFile(
        organization_id=organization_id,
        organization_name=organization_name,
        generated_at=datetime.now(timezone.utc),
    )
    merge_extraction_into_skills_file(sf, people=people)
    sf.coverage.total_employees = len(sf.people)
    _supabase().save_skills_file(sf)
    return {"ok": True, "people_loaded": len(people), "total_in_brain": len(sf.people)}


# ─── Build brain (manual trigger, for demo) ──────────────────────────────────


class BuildBrainRequest(BaseModel):
    organization_id: str = Field(default_factory=lambda: settings.default_org_id)


@app.post("/api/seed-from-sample")
async def seed_from_sample(only: Optional[str] = None) -> dict[str, Any]:
    """Public wrapper: catches any exception and returns it in the body so we
    can debug without depending on log streaming. Calls the inner impl below.
    """
    import traceback
    try:
        return await _seed_from_sample_inner(only=only)
    except Exception as e:  # noqa: BLE001
        tb = traceback.format_exc()
        # Log too, in case logs do work
        try:
            import structlog
            structlog.get_logger("seed").error(
                "seed_from_sample.failed", error=str(e), traceback=tb
            )
        except Exception:  # noqa: BLE001
            pass
        # Return 500 with the actual detail so the caller can see it
        raise HTTPException(
            status_code=500,
            detail={
                "error_class": type(e).__name__,
                "error_message": str(e),
                "traceback": tb.splitlines()[-15:],  # last 15 lines = the meat
            },
        )


async def _seed_from_sample_inner(only: Optional[str] = None) -> dict[str, Any]:
    """Process bundled sample_data/ → Skills File in Supabase.

    SYNCHRONOUS — returns after the work is done. Caller can pass
    ?only=ana_lopez|tomas_ledesma|roberto_pascual to process one transcript
    at a time. With no `only`, processes whichever isn't yet done (one per call).

    Why one-at-a-time: Render starter plans recycle workers on long-running
    background tasks. Sync per-call eliminates that. Each call ~30s.
    """
    import json as _json

    from backend.utils.org_chart_loader import load_org_chart

    repo_root = Path(__file__).resolve().parents[1]
    org_chart = repo_root / "sample_data" / "org_chart.csv"
    interviews_dir = repo_root / "sample_data" / "interviews"

    sb = _supabase()
    sf = sb.load_skills_file(settings.default_org_id) or SkillsFile(
        organization_id=settings.default_org_id,
        organization_name="Blur Bank",
        generated_at=datetime.now(timezone.utc),
    )
    seeded_org_chart = False
    if not sf.people:
        people = load_org_chart(org_chart)
        merge_extraction_into_skills_file(sf, people=people)
        sf.coverage.total_employees = len(sf.people)
        seeded_org_chart = True
        sb.save_skills_file(sf)

    # Pick the transcript: explicit or first unprocessed
    candidates = sorted(interviews_dir.glob("interview_*.json"))
    target_path = None
    if only:
        for p in candidates:
            if only in p.name:
                target_path = p
                break
        if not target_path:
            return {"ok": False, "reason": f"no interview matches {only!r}"}
    else:
        # Process the first one whose employee has no last_interviewed_at
        for p in candidates:
            payload = _json.loads(p.read_text(encoding="utf-8"))
            person = sf.person(payload.get("employee_id", ""))
            if not person or not person.last_interviewed_at:
                target_path = p
                break

    if not target_path:
        return {
            "ok": True,
            "done": True,
            "seeded_org_chart": seeded_org_chart,
            "message": "All transcripts already processed.",
            "coverage": sf.coverage.model_dump(),
        }

    payload = _json.loads(target_path.read_text(encoding="utf-8"))
    employee_id = payload.get("employee_id", "")
    existing = sf.person(employee_id)
    skeleton = (
        existing.model_dump(include={"id", "name", "role", "area", "email"})
        if existing
        else {"id": employee_id, "name": payload.get("employee_name", "")}
    )

    result = await process_interview(
        call_id=payload["call_id"],
        employee_skeleton=skeleton,
        transcript=payload["transcript"],
        skills_file=sf,
    )
    sb.save_skills_file(sf)
    sb.save_interview(
        call_id=payload["call_id"],
        org_id=settings.default_org_id,
        employee_id=employee_id,
        transcript=payload["transcript"],
        duration_sec=float(payload.get("duration_sec", 0)),
        completed_at=payload.get("completed_at"),
    )

    extracted = result["extraction"]
    return {
        "ok": True,
        "processed": target_path.name,
        "seeded_org_chart": seeded_org_chart,
        "extracted": {k: len(extracted.get(k, [])) for k in [
            "people", "tools", "access_paths", "processes",
            "ticket_types", "glossary", "informal_rules", "relationships"
        ]},
        "coverage": sf.coverage.model_dump(),
    }


@app.post("/api/seed-portals")
async def seed_portals() -> dict[str, Any]:
    """Load sample_data/jsd_portals.json into the Skills File as
    Tool + AccessPath + TicketType. Idempotent.

    This is what makes "donde subo este ticket?" answerable for new hires:
    25 BIND Jira Service Desk portals + ~190 request types become first-class
    entities the QA agent can cite.
    """
    from backend.utils.portals_loader import (
        load_portals,
        merge_portals_into_skills_file,
    )

    repo_root = Path(__file__).resolve().parents[1]
    json_path = repo_root / "sample_data" / "jsd_portals.json"
    if not json_path.exists():
        raise HTTPException(404, f"missing {json_path}")

    sb = _supabase()
    sf = sb.load_skills_file(settings.default_org_id) or SkillsFile(
        organization_id=settings.default_org_id,
        organization_name="Blur Bank",
        generated_at=datetime.now(timezone.utc),
    )

    data = load_portals(json_path)
    counts = merge_portals_into_skills_file(sf, data)
    sb.save_skills_file(sf)

    return {
        "ok": True,
        "source": data.get("_meta", {}).get("source"),
        **counts,
        "totals_after": {
            "tools": len(sf.tools),
            "access_paths": len(sf.access_paths),
            "ticket_types": len(sf.ticket_types),
        },
    }


@app.post("/api/build-brain")
async def build_brain(req: BuildBrainRequest) -> dict[str, Any]:
    """Process every interview row that hasn't been merged yet for this org."""
    sb = _supabase()
    interviews = sb.list_interviews_by_org(req.organization_id)
    processed: list[dict[str, Any]] = []
    sf = sb.load_skills_file(req.organization_id) or SkillsFile(
        organization_id=req.organization_id,
        organization_name=req.organization_id,
        generated_at=datetime.now(timezone.utc),
    )
    for it in interviews:
        if it.get("status") != "completed":
            continue
        full = sb.get_interview(it["id"])
        if not full:
            continue
        target = sf.person(full["employee_id"]) or None
        skeleton = (
            target.model_dump(include={"id", "name", "role", "area", "email"})
            if target
            else {"id": full["employee_id"], "name": full.get("employee_name", "")}
        )
        result = await process_interview(
            call_id=full["id"],
            employee_skeleton=skeleton,
            transcript=full["transcript"],
            skills_file=sf,
        )
        processed.append({"call_id": full["id"], "extraction_keys": list(result["extraction"].keys())})
    sb.save_skills_file(sf)
    return {
        "ok": True,
        "processed": len(processed),
        "coverage": sf.coverage.model_dump(),
    }


# ─── Q&A ─────────────────────────────────────────────────────────────────────


class AskRequest(BaseModel):
    query: str
    organization_id: str = Field(default_factory=lambda: settings.default_org_id)
    thread_id: Optional[str] = None
    user_email: Optional[str] = None


@app.post("/api/ask")
async def api_ask(req: AskRequest) -> dict[str, Any]:
    sf = _get_skills_file_or_404(req.organization_id)
    answer = await answer_query(query=req.query, skills_file=sf)
    return answer


# ─── Skills File / interviews ────────────────────────────────────────────────


@app.get("/api/skills-file")
async def get_skills_file(organization_id: Optional[str] = None) -> dict[str, Any]:
    org_id = organization_id or settings.default_org_id
    sf = _get_skills_file_or_404(org_id)
    return sf.model_dump(mode="json")


@app.get("/api/interviews")
async def list_interviews(organization_id: Optional[str] = None) -> dict[str, Any]:
    org_id = organization_id or settings.default_org_id
    sf = _supabase().load_skills_file(org_id)
    interviews = _supabase().list_interviews_by_org(org_id)
    coverage = sf.coverage.model_dump() if sf else {"interviewed": 0, "total_employees": 0}
    return {"organization_id": org_id, "interviews": interviews, "coverage": coverage}


# ─── Scheduling + outbound calls ─────────────────────────────────────────────


class ScheduleRequest(BaseModel):
    organization_id: str = Field(default_factory=lambda: settings.default_org_id)
    employee_ids: Optional[list[str]] = None  # None = all


@app.post("/api/schedule")
async def api_schedule(req: ScheduleRequest) -> dict[str, Any]:
    from backend.agents.schedule_agent import schedule_all

    sf = _get_skills_file_or_404(req.organization_id)
    targets = sf.people
    if req.employee_ids:
        targets = [p for p in sf.people if p.id in req.employee_ids]
    rows = [
        {"id": p.id, "name": p.name, "email": p.email or ""}
        for p in targets
        if p.email
    ]
    results = schedule_all(rows)
    return {"ok": True, "scheduled": results}


class InitiateCallRequest(BaseModel):
    employee_id: str
    organization_id: str = Field(default_factory=lambda: settings.default_org_id)


@app.post("/api/call/initiate")
async def api_initiate_call(req: InitiateCallRequest) -> dict[str, Any]:
    from backend.agents.interview_agent import (
        create_or_update_agent,
        initiate_phone_call,
    )

    sf = _get_skills_file_or_404(req.organization_id)
    person = sf.person(req.employee_id)
    if not person or not person.phone:
        raise HTTPException(404, "employee not found or has no phone")

    agent_id = settings.retell_agent_id
    if not agent_id:
        agent = create_or_update_agent(person.name)
        agent_id = agent.get("agent_id", "")
    result = initiate_phone_call(
        agent_id=agent_id,
        to_number=person.phone,
        employee_id=person.id,
        employee_name=person.name,
        employee_role=person.role or "",
        employee_area=person.area or "",
    )
    return {"ok": True, "call_id": result.get("call_id"), "agent_id": agent_id}


@app.post("/api/call/web-initiate")
async def api_initiate_web_call(req: InitiateCallRequest) -> dict[str, Any]:
    """Create a Retell web call and return the URL to open in the browser.

    Best path for live demos — no Twilio SIP setup needed. The user opens the
    URL, grants mic permission, and the agent talks via WebRTC. When the
    call ends, our /retell/webhook fires the same as a phone call would,
    so the post-interview pipeline runs identically.
    """
    from backend.agents.interview_agent import (
        create_or_update_agent,
        initiate_web_call,
    )

    sf = _get_skills_file_or_404(req.organization_id)
    person = sf.person(req.employee_id)
    if not person:
        raise HTTPException(404, "employee not found")

    agent_id = settings.retell_agent_id
    if not agent_id:
        agent = create_or_update_agent(person.name)
        agent_id = agent.get("agent_id", "")

    result = initiate_web_call(
        agent_id=agent_id,
        employee_id=person.id,
        employee_name=person.name,
        employee_role=person.role or "",
        employee_area=person.area or "",
    )
    call_id = result.get("call_id", "")
    access_token = result.get("access_token", "")
    # NOTE: Retell does NOT provide a public hosted call page. The previous
    # `https://app.retellai.com/conversation?...` URL is the internal Retell
    # dashboard and is not reachable for end users (ERR_TUNNEL_CONNECTION_FAILED).
    # The frontend must instantiate `retell-client-js-sdk` and call
    # `client.startCall({ accessToken })` from inside our own modal/page.
    return {
        "ok": True,
        "call_id": call_id,
        "agent_id": agent_id,
        "access_token": access_token,
    }


# ─── Retell webhook ──────────────────────────────────────────────────────────


@app.post("/retell/webhook")
async def retell_webhook(request: Request, background: BackgroundTasks) -> dict[str, Any]:
    payload = await request.json()
    event = payload.get("event") or payload.get("type")
    if event != "call_ended":
        return {"ok": True, "ignored": event}

    call = payload.get("call") or payload
    call_id = call.get("call_id") or call.get("id")
    metadata = call.get("metadata") or {}
    employee_id = metadata.get("employee_id")
    org_id = metadata.get("organization_id") or settings.default_org_id
    transcript_payload = call.get("transcript_object") or call.get("transcript") or []
    duration = float(call.get("duration_ms", 0)) / 1000.0

    transcript = (
        normalize_retell_transcript(transcript_payload)
        if isinstance(transcript_payload, list) and transcript_payload
        and isinstance(transcript_payload[0], dict)
        else transcript_payload
    )

    _supabase().save_interview(
        call_id=call_id,
        org_id=org_id,
        employee_id=employee_id or "unknown",
        transcript=transcript,
        duration_sec=duration,
    )

    background.add_task(_process_interview_bg, call_id=call_id, org_id=org_id, employee_id=employee_id)
    return {"ok": True, "call_id": call_id, "queued_processing": True}


async def _process_interview_bg(*, call_id: str, org_id: str, employee_id: Optional[str]) -> None:
    sb = _supabase()
    full = sb.get_interview(call_id)
    if not full:
        return
    sf = sb.load_skills_file(org_id) or SkillsFile(
        organization_id=org_id,
        organization_name=org_id,
        generated_at=datetime.now(timezone.utc),
    )
    target = sf.person(employee_id or "")
    skeleton = (
        target.model_dump(include={"id", "name", "role", "area", "email"})
        if target
        else {"id": employee_id or "unknown", "name": ""}
    )
    await process_interview(
        call_id=call_id,
        employee_skeleton=skeleton,
        transcript=full["transcript"],
        skills_file=sf,
    )
    sb.save_skills_file(sf)


# ─── Channel webhooks: Google Chat + WhatsApp ────────────────────────────────


@app.post("/channels/gchat/webhook")
async def gchat_webhook(request: Request) -> JSONResponse:
    """Google Chat HTTP webhook.

    Synchronous: the response of this endpoint IS the message that gets
    posted back to the user. Google Chat allows up to ~30s but the user
    perceives anything over 5s as broken, so we run the agent in fast mode
    (Haiku 4.5, no extended thinking) → ~2-3s end-to-end.

    Async pattern (post placeholder + chat.update like Slack) is possible via
    the Chat REST API with a `chat.bot` service account, but adds setup
    overhead and isn't needed yet at this latency.
    """
    payload = await request.json()
    msg = GCHAT.parse_inbound(payload)
    if not msg:
        return JSONResponse({"text": ""})  # silent ack for ADDED_TO_SPACE etc.
    sf = _get_skills_file_or_404(msg.organization_id)
    answer = await answer_query(query=msg.text, skills_file=sf, fast=True)
    return JSONResponse(GCHAT.format_response(answer))


@app.post("/channels/slack/events")
async def slack_events(request: Request, background: BackgroundTasks) -> JSONResponse:
    """Slack Events API webhook.

    Handles three things:
      1. URL verification challenge (initial setup with Slack).
      2. Signature verification (rejects requests not from Slack).
      3. Event dispatch — app_mention or message.im → background Q&A,
         answer is posted back via chat.postMessage so we ack within 3s.
    """
    body = await request.body()
    try:
        payload = json.loads(body) if body else {}
    except json.JSONDecodeError:
        return JSONResponse({"error": "invalid json"}, status_code=400)

    # 1. URL verification (no signature check on this — happens during setup)
    if payload.get("type") == "url_verification":
        return JSONResponse({"challenge": payload.get("challenge", "")})

    # 2. Verify signature
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")
    if not SLACK.verify_signature(body, timestamp, signature):
        return JSONResponse({"error": "invalid signature"}, status_code=401)

    # 3. Parse + dispatch
    msg = SLACK.parse_inbound(payload)
    if not msg:
        return JSONResponse({"ok": True, "ignored": True})

    event = payload.get("event") or {}
    background.add_task(
        _slack_qa_background,
        text=msg.text,
        organization_id=msg.organization_id,
        slack_channel=event.get("channel", ""),
        thread_ts=event.get("thread_ts") or event.get("ts"),
    )
    return JSONResponse({"ok": True})


def _detect_ticket_intent(query: str) -> Optional[dict[str, Any]]:
    """Heuristic detector — should we offer to create a Jira ticket?

    Demo-grade keyword matcher. The proper version would route through the
    same portal_router that already maps queries → portal + request_type_id,
    but for the v1 Slack demo this is enough to trigger the button on the
    obvious onboarding queries ("necesito acceso a X", "blanqueo password").

    Returns the payload to put in the button's `value` field, or None if no
    button should be shown. Currently maps everything to request_type_id=10
    (Get IT help) which has no required custom fields — keeps the demo
    working without per-request-type field discovery.
    """
    q = (query or "").lower().strip()
    if not q:
        return None

    base = {
        "service_desk_id": "2",
        "request_type_id": "10",
        "summary": query[:100],
        "description": query,
    }

    # Access requests
    if any(kw in q for kw in [
        "necesito acceso", "no puedo entrar", "no puedo acceder",
        "alta de cuenta", "request access", "dame acceso",
        "darme acceso", "pedir acceso", "solicitar acceso",
    ]):
        return {**base, "summary": f"Solicitud de acceso — {query[:80]}"}

    # Password reset / unlock
    if any(kw in q for kw in [
        "blanquear", "blanqueo", "olvide mi", "olvidé mi", "olvide la",
        "olvidé la", "reset password", "resetear", "contraseña",
        "password", "clave", "se me bloqueo", "se me bloqueó",
    ]):
        return {**base, "summary": f"Blanqueo / reset — {query[:80]}"}

    # Hardware / VPN / generic IT
    if any(kw in q for kw in [
        "crear ticket", "abrir ticket", "abrir incidente", "abrir caso",
        "subir ticket", "levantar ticket", "no me anda", "no funciona",
        "está caido", "esta caido", "está caída", "vpn",
    ]):
        return base

    return None


async def _slack_qa_background(
    *,
    text: str,
    organization_id: str,
    slack_channel: str,
    thread_ts: Optional[str],
) -> None:
    """Run Q&A and post the answer back to Slack.

    UX flow:
      1. Post a "Pensando…" placeholder immediately so the user sees activity
         in <1s, even though the agent takes 2-5s.
      2. Run answer_query in fast mode (Haiku, no extended thinking).
      3. Edit the placeholder in-place via chat.update with the real answer.
      4. If chat.update fails for any reason (rare), fall back to a fresh
         postMessage so the user still gets the answer.
    """
    import structlog
    log = structlog.get_logger("slack_qa")

    # 1. Placeholder — best-effort, don't block on failure
    placeholder_ts: Optional[str] = None
    try:
        placeholder = await SLACK.post_message(
            channel=slack_channel,
            payload=SLACK.thinking_payload(),
            thread_ts=thread_ts,
        )
        placeholder_ts = placeholder.get("ts")
    except Exception as e:  # noqa: BLE001
        log.warning("slack.placeholder_failed", error=str(e))

    # 2. Build the real answer payload
    sf = _supabase().load_skills_file(organization_id)
    if not sf:
        msg_payload: dict[str, Any] = {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":warning: El Brain de tu organización aún no fue construido. "
                        "Subí el organigrama y entrevistá empleados para empezar.",
                    },
                }
            ],
            "text": "Brain not built yet",
        }
    else:
        # fast=True → Haiku 4.5, no extended thinking, lower max_tokens.
        # Trades a small quality dip for ~3x lower latency on Slack DMs.
        answer = await answer_query(query=text, skills_file=sf, fast=True)
        msg_payload = SLACK.format_response(answer)

        # The agent decides if a ticket should be proposed by emitting a
        # `proposed_ticket` object in submit_answer. If present, render the
        # action buttons. This replaces the earlier keyword-based detector —
        # the model can reason about intent + pick the right request_type_id.
        proposed = answer.get("proposed_ticket") if isinstance(answer, dict) else None
        if not proposed:
            # Fallback: legacy keyword detector. Kept so the demo still works
            # if the model forgets to emit proposed_ticket.
            proposed = _detect_ticket_intent(text)

        if proposed:
            ticket_payload = {
                "service_desk_id": str(proposed.get("service_desk_id", "2")),
                "request_type_id": str(proposed.get("request_type_id", "10")),
                "summary": (proposed.get("summary") or text)[:200],
                "description": proposed.get("description") or text,
            }
            ticket_blocks = [
                # Tiny context line above the buttons explaining what the
                # agent inferred — builds trust without being noisy.
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": (
                                f":robot_face: _Puedo crear un ticket por vos._  "
                                f"*{ticket_payload['summary']}*"
                            ),
                        }
                    ],
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": ":white_check_mark: Crear ticket en Jira",
                                "emoji": True,
                            },
                            "style": "primary",
                            "action_id": "create_ticket",
                            "value": json.dumps(ticket_payload)[:1900],
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Cancelar",
                                "emoji": True,
                            },
                            "action_id": "cancel_ticket",
                            "value": "cancel",
                        },
                    ],
                },
            ]
            # Insert RIGHT AFTER the summary section so the CTA is visible
            # without scrolling. The summary is the first section block in
            # format_response (after the "Brain" context chip). Find it and
            # splice the ticket blocks in.
            blocks = msg_payload.setdefault("blocks", [])
            insert_idx = 1  # skip header chip if present
            for i, b in enumerate(blocks):
                if b.get("type") == "section":
                    insert_idx = i + 1
                    break
            msg_payload["blocks"] = (
                blocks[:insert_idx] + ticket_blocks + blocks[insert_idx:]
            )

    # 3. Edit the placeholder in place when possible — keeps the channel clean
    if placeholder_ts:
        try:
            await SLACK.update_message(
                channel=slack_channel,
                ts=placeholder_ts,
                payload=msg_payload,
            )
            return
        except Exception as e:  # noqa: BLE001
            log.warning("slack.update_failed_falling_back", error=str(e))

    # 4. Fallback: post fresh
    await SLACK.post_message(
        channel=slack_channel,
        payload=msg_payload,
        thread_ts=thread_ts,
    )


# ─── Atlassian / Jira — discover catalogue + create tickets ──────────────────


@app.get("/api/jira/discover")
async def jira_discover() -> JSONResponse:
    """Return all service desks + their request types. Use once after creating
    the Jira project to figure out the IDs to wire into the agent's
    `propose_create_ticket` flow.

    Auth: relies on JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN env vars. No org
    isolation — single-tenant for the demo.
    """
    jira = get_jira_client()
    try:
        desks = await jira.list_service_desks()
    except JiraNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))

    out: list[dict[str, Any]] = []
    for desk in desks:
        try:
            request_types = await jira.list_request_types(desk["id"])
        except Exception as e:  # noqa: BLE001
            request_types = [{"_error": str(e)}]
        out.append(
            {
                "service_desk_id": desk.get("id"),
                "project_key": desk.get("projectKey"),
                "project_name": desk.get("projectName"),
                "request_types": [
                    {
                        "id": rt.get("id"),
                        "name": rt.get("name"),
                        "description": rt.get("description"),
                        "issue_type_id": rt.get("issueTypeId"),
                    }
                    for rt in request_types
                ],
            }
        )
    return JSONResponse({"service_desks": out})


class CreateTicketBody(BaseModel):
    service_desk_id: str
    request_type_id: str
    summary: str
    description: Optional[str] = None
    raise_on_behalf_of: Optional[str] = Field(
        None, description="Email of the actual requester. Bot must be JSM agent."
    )
    request_field_values: Optional[dict[str, Any]] = None


@app.post("/api/tickets/create")
async def create_ticket(body: CreateTicketBody) -> JSONResponse:
    """RPC: create a JSM request directly. Used both as a debug endpoint and
    as the path the Slack button-click handler delegates to."""
    jira = get_jira_client()
    try:
        result = await jira.create_request(
            service_desk_id=body.service_desk_id,
            request_type_id=body.request_type_id,
            summary=body.summary,
            description=body.description,
            request_field_values=body.request_field_values,
            raise_on_behalf_of=body.raise_on_behalf_of,
        )
    except JiraNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Jira API error: {e}")

    return JSONResponse(
        {
            "ok": True,
            "issue_key": result.get("issueKey"),
            "web_url": (result.get("_links") or {}).get("web"),
            "raw": result,
        }
    )


# ─── Slack interactivity (button clicks) ─────────────────────────────────────


@app.post("/channels/slack/interactivity")
async def slack_interactivity(request: Request) -> JSONResponse:
    """Handle Slack interactive payloads — buttons, modals, etc.

    For now we only handle the `create_ticket` button on the Q&A response
    card. When the user clicks it, we:
      1. Verify the request is from Slack (signing secret).
      2. Parse the action and `value` (which carries portal_id, request_type
         _id, summary, description packaged when the original message was
         sent).
      3. Call jira_client.create_request to actually create the ticket.
      4. Update the original message in-place so the buttons disappear and
         the user sees "✅ Ticket BLUR-N creado · [link]".

    Slack delivers form-encoded body with a single `payload` field that is
    JSON-encoded.
    """
    body = await request.body()
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")
    if not SLACK.verify_signature(body, timestamp, signature):
        return JSONResponse({"error": "invalid signature"}, status_code=401)

    # Slack sends application/x-www-form-urlencoded with a single `payload` field
    from urllib.parse import parse_qs

    decoded = parse_qs(body.decode("utf-8"))
    payload_raw = (decoded.get("payload") or [""])[0]
    if not payload_raw:
        return JSONResponse({"error": "missing payload"}, status_code=400)
    try:
        payload = json.loads(payload_raw)
    except json.JSONDecodeError:
        return JSONResponse({"error": "invalid payload json"}, status_code=400)

    actions = payload.get("actions") or []
    if not actions:
        return JSONResponse({"ok": True, "ignored": True})
    action = actions[0]

    action_id = action.get("action_id")

    # Cancel button — just remove the actions block from the message
    if action_id == "cancel_ticket":
        channel_id = (payload.get("channel") or {}).get("id", "")
        message_ts = (payload.get("message") or {}).get("ts", "")
        original_blocks = (payload.get("message") or {}).get("blocks") or []
        # Drop the actions block so the buttons disappear, leave the rest
        kept_blocks = [b for b in original_blocks if b.get("type") != "actions"]
        if channel_id and message_ts:
            try:
                await SLACK.update_message(
                    channel=channel_id,
                    ts=message_ts,
                    payload={
                        "blocks": kept_blocks
                        + [
                            {
                                "type": "context",
                                "elements": [
                                    {"type": "mrkdwn", "text": "_Cancelado por el usuario_"}
                                ],
                            }
                        ],
                        "text": "Cancelado",
                    },
                )
            except Exception:  # noqa: BLE001
                pass
        return JSONResponse({"ok": True})

    if action_id != "create_ticket":
        # Future: handle other action ids (followup buttons etc.)
        return JSONResponse({"ok": True, "ignored": True})

    try:
        ticket_args = json.loads(action.get("value") or "{}")
    except json.JSONDecodeError:
        return JSONResponse({"error": "invalid action value"}, status_code=400)

    # Pull message coords so we can edit it in place
    channel_id = (payload.get("channel") or {}).get("id", "")
    message_ts = (payload.get("message") or {}).get("ts", "")
    user_email = (payload.get("user") or {}).get("email")  # may be empty if scope
                                                            # doesn't include users:read.email

    # Run the create + the message edit in the background so we ack within 3s.
    import asyncio
    asyncio.create_task(
        _slack_create_ticket_and_update(
            channel_id=channel_id,
            message_ts=message_ts,
            ticket_args=ticket_args,
            requester_email=user_email,
        )
    )
    return JSONResponse({"ok": True})


async def _slack_create_ticket_and_update(
    *,
    channel_id: str,
    message_ts: str,
    ticket_args: dict[str, Any],
    requester_email: Optional[str],
) -> None:
    """Background: create JSM request, then chat.update the message."""
    import structlog
    log = structlog.get_logger("slack_create_ticket")
    jira = get_jira_client()
    try:
        result = await jira.create_request(
            service_desk_id=ticket_args["service_desk_id"],
            request_type_id=ticket_args["request_type_id"],
            summary=ticket_args.get("summary") or "Solicitud creada desde Slack",
            description=ticket_args.get("description"),
            raise_on_behalf_of=requester_email,
        )
        issue_key = result.get("issueKey", "—")
        web_url = (result.get("_links") or {}).get("web", "")
        ok_payload = {
            "blocks": [
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": ":white_check_mark: *Ticket creado*"}
                    ],
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"*<{web_url}|{issue_key}>*\n"
                            f"_{ticket_args.get('summary', '')}_"
                            if web_url
                            else f"*{issue_key}*\n_{ticket_args.get('summary', '')}_"
                        ),
                    },
                },
            ],
            "text": f"Ticket {issue_key} creado",
        }
    except Exception as e:  # noqa: BLE001
        log.warning("slack.create_ticket_failed", error=str(e))
        ok_payload = {
            "blocks": [
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": ":x: *No pude crear el ticket*"}
                    ],
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"_{e}_\n\nProbá creándolo manual en el portal.",
                    },
                },
            ],
            "text": "Error creating ticket",
        }
    if channel_id and message_ts:
        try:
            await SLACK.update_message(
                channel=channel_id,
                ts=message_ts,
                payload=ok_payload,
            )
        except Exception as e:  # noqa: BLE001
            log.warning("slack.update_after_ticket_failed", error=str(e))


@app.post("/channels/whatsapp/webhook")
async def whatsapp_webhook(request: Request) -> dict[str, Any]:
    # WhatsApp is scaffolded but not active until Meta verification arrives.
    # We still parse + answer + log so the path is testable.
    try:
        payload = await request.json()
    except Exception:
        form = await request.form()
        payload = dict(form)

    msg = WHATSAPP.parse_inbound(payload)
    if not msg:
        return {"ok": True, "ignored": True}
    sf = _supabase().load_skills_file(msg.organization_id)
    if not sf:
        return {"ok": False, "reason": "no skills file"}
    answer = await answer_query(query=msg.text, skills_file=sf)
    return {"ok": True, "would_send": WHATSAPP.format_response(answer)}


# ─── Local dev entry point ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
