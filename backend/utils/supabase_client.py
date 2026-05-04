"""Supabase client + tiny helpers for the 5 tables.

Tables (created by migrations/001_init.sql — see eval/run_eval.py for setup):
    organizations
    people
    skills_file       (one row per organization, jsonb of the full graph)
    interviews        (one row per call, jsonb transcript + status)
    eval_runs         (audit log of eval results)

This module never embeds business logic. It's a thin async wrapper.
"""

from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from typing import Any, Optional

from supabase import Client, create_client

from backend.config import settings
from backend.models.schemas import SkillsFile


@lru_cache(maxsize=1)
def get_client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Supabase credentials missing. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in your .env."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


# ─── Skills File CRUD ────────────────────────────────────────────────────────


def load_skills_file(org_id: str) -> Optional[SkillsFile]:
    """Read the current Skills File for an org, or None if not built yet."""
    res = (
        get_client()
        .table("skills_file")
        .select("payload")
        .eq("organization_id", org_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        return None
    return SkillsFile.model_validate(res.data[0]["payload"])


def ensure_organization(org_id: str, org_name: str = "") -> None:
    """Idempotent insert into organizations — required before any FK-bearing
    table accepts the org_id. Called automatically by save_skills_file so
    new tenants don't crash on first write.
    """
    client = get_client()
    payload = {"id": org_id, "name": org_name or org_id}
    client.table("organizations").upsert(payload, on_conflict="id").execute()


def save_skills_file(skills: SkillsFile) -> None:
    """Upsert the full Skills File for an org. Auto-creates the organizations
    row if missing — fixes FK violation on first upload of a new tenant."""
    ensure_organization(skills.organization_id, skills.organization_name or "")
    get_client().table("skills_file").upsert(
        {
            "organization_id": skills.organization_id,
            "payload": skills.model_dump(mode="json"),
            "updated_at": datetime.utcnow().isoformat(),
        },
        on_conflict="organization_id",
    ).execute()


# ─── Interviews ──────────────────────────────────────────────────────────────


def save_interview(
    *,
    call_id: str,
    org_id: str,
    employee_id: str,
    transcript: list[dict[str, Any]],
    duration_sec: float,
    completed_at: Optional[str] = None,
    status: str = "completed",
) -> None:
    get_client().table("interviews").upsert(
        {
            "id": call_id,
            "organization_id": org_id,
            "employee_id": employee_id,
            "transcript": transcript,
            "duration_sec": duration_sec,
            "completed_at": completed_at or datetime.utcnow().isoformat(),
            "status": status,
        },
        on_conflict="id",
    ).execute()


def get_interview(call_id: str) -> Optional[dict[str, Any]]:
    res = (
        get_client()
        .table("interviews")
        .select("*")
        .eq("id", call_id)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def list_interviews_by_org(org_id: str) -> list[dict[str, Any]]:
    res = (
        get_client()
        .table("interviews")
        .select("id, employee_id, status, duration_sec, completed_at")
        .eq("organization_id", org_id)
        .order("completed_at", desc=True)
        .execute()
    )
    return res.data or []


# ─── Eval runs ───────────────────────────────────────────────────────────────


def log_eval_run(
    *,
    git_sha: str,
    environment: str,
    cases_total: int,
    cases_passed: int,
    detail: dict[str, Any],
) -> None:
    get_client().table("eval_runs").insert(
        {
            "git_sha": git_sha,
            "environment": environment,
            "cases_total": cases_total,
            "cases_passed": cases_passed,
            "detail": detail,
            "ran_at": datetime.utcnow().isoformat(),
        }
    ).execute()
