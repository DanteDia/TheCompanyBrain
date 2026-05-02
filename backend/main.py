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
from datetime import datetime, timezone
from io import StringIO
from typing import Any, Optional

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
from backend.channels.whatsapp import WhatsAppChannel
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
    organization_name: str = Form(default="Banco Demo"),
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
    )
    return {"ok": True, "call_id": result.get("call_id"), "agent_id": agent_id}


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
    payload = await request.json()
    msg = GCHAT.parse_inbound(payload)
    if not msg:
        return JSONResponse({"text": ""})  # silent ack
    sf = _get_skills_file_or_404(msg.organization_id)
    answer = await answer_query(query=msg.text, skills_file=sf)
    return JSONResponse(GCHAT.format_response(answer))


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
