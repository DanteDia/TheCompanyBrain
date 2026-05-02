"""Schedule agent — Google Calendar invitations with auto-generated Meet links.

Service account auth with domain-wide delegation. The customer's Google
Workspace admin authorizes our SA's client_id with the calendar scopes; we
impersonate an admin (CALENDAR_ORGANIZER_EMAIL) to create the events.

For V1 demo: this only needs to work for 1-2 invitations to Tomy/Dante.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import structlog

from backend.config import settings

log = structlog.get_logger("schedule_agent")

CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
]


def _credentials():
    """Load Google service account credentials from inline JSON or path."""
    from google.oauth2 import service_account  # lazy import

    if settings.gcp_service_account_json:
        info = json.loads(settings.gcp_service_account_json)
    elif settings.gcp_service_account_json_path and Path(
        settings.gcp_service_account_json_path
    ).exists():
        info = json.loads(Path(settings.gcp_service_account_json_path).read_text())
    else:
        raise RuntimeError(
            "No GCP service account configured. Set GCP_SERVICE_ACCOUNT_JSON "
            "(inline) or GCP_SERVICE_ACCOUNT_JSON_PATH (file)."
        )

    creds = service_account.Credentials.from_service_account_info(
        info, scopes=CALENDAR_SCOPES
    )
    if not settings.calendar_organizer_email:
        raise RuntimeError(
            "CALENDAR_ORGANIZER_EMAIL not set — required for domain-wide delegation."
        )
    return creds.with_subject(settings.calendar_organizer_email)


def _calendar_service():
    from googleapiclient.discovery import build  # lazy import

    return build("calendar", "v3", credentials=_credentials(), cache_discovery=False)


def schedule_interview(
    *,
    employee_email: str,
    employee_first_name: str,
    slot_start: datetime,
    duration_minutes: int = 10,
) -> dict[str, Any]:
    """Create a calendar event with auto-generated Google Meet link."""
    service = _calendar_service()
    end = slot_start + timedelta(minutes=duration_minutes)
    event = {
        "summary": f"Brain · 7 min de entrevista con {employee_first_name}",
        "description": (
            "Hola — te agendamos 7 minutos para que un agente del proyecto "
            "Company Brain te haga unas preguntas cortas sobre como trabajas. "
            "Tu input es lo que va a armar el sistema interno de la empresa. "
            "Si no te queda comodo el horario, movelo libremente.\n\n"
            "Al unirte a la llamada confirmas tu consentimiento para que la "
            "conversacion sea transcripta y procesada por el sistema."
        ),
        "start": {
            "dateTime": slot_start.isoformat(),
            "timeZone": settings.default_timezone,
        },
        "end": {
            "dateTime": end.isoformat(),
            "timeZone": settings.default_timezone,
        },
        "attendees": [{"email": employee_email}],
        "conferenceData": {
            "createRequest": {
                "requestId": f"brain-{int(slot_start.timestamp())}-{employee_email.split('@')[0]}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
    }
    result = (
        service.events()
        .insert(
            calendarId="primary",
            body=event,
            conferenceDataVersion=1,
            sendUpdates="all",
        )
        .execute()
    )
    log.info(
        "calendar.event_created",
        event_id=result.get("id"),
        meet_link=result.get("hangoutLink"),
        attendee=employee_email,
    )
    return result


def schedule_all(
    employees: list[dict[str, Any]],
    *,
    start_at: Optional[datetime] = None,
    minutes_per_slot: int = 15,
) -> list[dict[str, Any]]:
    """Distribute employees in 15-min slots across business hours (9-18, M-F)."""
    if start_at is None:
        start_at = datetime.now(timezone.utc) + timedelta(days=1)
    slot = start_at.replace(hour=9, minute=0, second=0, microsecond=0)
    out: list[dict[str, Any]] = []
    for emp in employees:
        # Skip weekends + outside business hours
        while slot.weekday() >= 5 or slot.hour < 9 or slot.hour >= 18:
            slot += timedelta(minutes=minutes_per_slot)
            if slot.hour >= 18:
                slot = slot.replace(hour=9, minute=0) + timedelta(days=1)
        result = schedule_interview(
            employee_email=emp["email"],
            employee_first_name=(emp.get("name") or "").split()[0] or "",
            slot_start=slot,
        )
        out.append(
            {
                "employee_id": emp.get("id"),
                "event_id": result.get("id"),
                "meet_link": result.get("hangoutLink"),
                "slot": slot.isoformat(),
            }
        )
        slot += timedelta(minutes=minutes_per_slot)
    return out
