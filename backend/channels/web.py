"""Web channel — for the Next.js /ask page.

Inbound payload (from the frontend):
    { "query": str, "thread_id": Optional[str], "user_email": Optional[str] }

Outbound payload (rendered by the frontend):
    Whatever the Q&A Answer dict already is — frontend understands the schema.
"""

from __future__ import annotations

from typing import Any, Optional

from backend.channels.base import ChannelAdapter, IncomingMessage
from backend.config import settings


class WebChannel(ChannelAdapter):
    name = "web"

    def parse_inbound(self, payload: dict[str, Any]) -> Optional[IncomingMessage]:
        query = (payload.get("query") or "").strip()
        if not query:
            return None
        return IncomingMessage(
            organization_id=payload.get("organization_id") or settings.default_org_id,
            user_id=payload.get("user_email") or "anonymous",
            user_name=payload.get("user_name"),
            text=query,
            thread_id=payload.get("thread_id"),
            raw=payload,
        )

    def format_response(self, answer: dict[str, Any]) -> dict[str, Any]:
        # Frontend reads Answer schema directly — pass through.
        return answer
