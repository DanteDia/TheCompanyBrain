"""Atlassian Jira / JSM REST API client.

Used by the agent to actually CREATE tickets — not just route the user to
the right portal. Auth is HTTP Basic with email + API token (recommended
for server-to-server in Atlassian Cloud).

Surface kept small on purpose: list service desks, list request types,
create a request, get a request. Anything else can be added when the demo
needs it.

Endpoints reference:
  https://developer.atlassian.com/cloud/jira/service-desk/rest/intro/
"""

from __future__ import annotations

import base64
from typing import Any, Optional

import httpx
import structlog

from backend.config import settings

log = structlog.get_logger("jira")


class JiraNotConfiguredError(RuntimeError):
    """Raised when JIRA_* env vars aren't set. Surfaces to the channel as a
    polite "configure Jira first" message rather than crashing the app."""


class JiraClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        api_token: Optional[str] = None,
    ) -> None:
        self.base_url = (base_url or settings.jira_base_url or "").rstrip("/")
        self.email = email or settings.jira_email or ""
        self.api_token = api_token or settings.jira_api_token or ""

    # ── Auth ─────────────────────────────────────────────────────────────────

    def _ensure_configured(self) -> None:
        if not (self.base_url and self.email and self.api_token):
            raise JiraNotConfiguredError(
                "Jira credentials not set. Configure JIRA_BASE_URL, JIRA_EMAIL "
                "and JIRA_API_TOKEN in env."
            )

    def _auth_header(self) -> dict[str, str]:
        token = base64.b64encode(
            f"{self.email}:{self.api_token}".encode()
        ).decode()
        return {
            "Authorization": f"Basic {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    # ── Read ─────────────────────────────────────────────────────────────────

    async def list_service_desks(self) -> list[dict[str, Any]]:
        """List all JSM service desks the bot can see. Used by /api/jira/discover
        to dump the catalogue once so we can map portals → IDs."""
        self._ensure_configured()
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{self.base_url}/rest/servicedeskapi/servicedesk",
                headers=self._auth_header(),
            )
        r.raise_for_status()
        return r.json().get("values", [])

    async def list_request_types(
        self, service_desk_id: str | int
    ) -> list[dict[str, Any]]:
        """List request types within a service desk. Each has an `id` we need
        to pass when creating a request."""
        self._ensure_configured()
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{self.base_url}/rest/servicedeskapi/servicedesk/"
                f"{service_desk_id}/requesttype",
                headers=self._auth_header(),
            )
        r.raise_for_status()
        return r.json().get("values", [])

    async def get_request(self, issue_key: str) -> dict[str, Any]:
        """Fetch a request by issue key (e.g. BLUR-1)."""
        self._ensure_configured()
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{self.base_url}/rest/servicedeskapi/request/{issue_key}",
                headers=self._auth_header(),
            )
        r.raise_for_status()
        return r.json()

    # ── Write ────────────────────────────────────────────────────────────────

    async def create_request(
        self,
        *,
        service_desk_id: str | int,
        request_type_id: str | int,
        summary: str,
        description: Optional[str] = None,
        request_field_values: Optional[dict[str, Any]] = None,
        raise_on_behalf_of: Optional[str] = None,
    ) -> dict[str, Any]:
        """Create a JSM request (a.k.a. ticket / issue).

        `request_field_values` lets you set arbitrary custom fields keyed by
        their fieldId (you can find these via list_request_types — each rt
        returns a `requestTypeFields` array describing its required inputs).

        `raise_on_behalf_of` is the email of the actual requester. Useful so
        the ticket isn't attributed to the bot. Requires the bot account to
        have JSM agent permissions; falls back silently if Jira rejects it.

        Returns the JSM request object (includes `issueKey`, `_links.web`).
        """
        self._ensure_configured()

        fields = {"summary": summary}
        if description:
            fields["description"] = description
        if request_field_values:
            fields.update(request_field_values)

        payload: dict[str, Any] = {
            "serviceDeskId": str(service_desk_id),
            "requestTypeId": str(request_type_id),
            "requestFieldValues": fields,
        }
        if raise_on_behalf_of:
            payload["raiseOnBehalfOf"] = raise_on_behalf_of

        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                f"{self.base_url}/rest/servicedeskapi/request",
                headers=self._auth_header(),
                json=payload,
            )
        if r.status_code >= 400:
            log.warning(
                "jira.create_failed",
                status=r.status_code,
                body=r.text[:500],
                payload_keys=list(payload.keys()),
            )
        r.raise_for_status()
        return r.json()


# Module-level singleton for normal use. Tests can construct fresh instances.
_default: Optional[JiraClient] = None


def get_jira_client() -> JiraClient:
    global _default
    if _default is None:
        _default = JiraClient()
    return _default
