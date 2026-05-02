"""WhatsApp channel — scaffolded only. Inactive until Meta Business Verification
is approved (or Twilio sandbox is configured for demo-only use).

Inbound: Meta WhatsApp Business webhook OR Twilio WhatsApp webhook payload.
Outbound: Meta Cloud API send-message OR Twilio messages.create().

V1: not wired in main.py — toggle on once verification completes.
"""

from __future__ import annotations

from typing import Any, Optional

from backend.channels.base import ChannelAdapter, IncomingMessage
from backend.config import settings


class WhatsAppChannel(ChannelAdapter):
    name = "whatsapp"

    def parse_inbound(self, payload: dict[str, Any]) -> Optional[IncomingMessage]:
        # Twilio WhatsApp webhook shape (form-encoded, but normalized to dict by FastAPI):
        if "From" in payload and "Body" in payload:
            return IncomingMessage(
                organization_id=settings.default_org_id,
                user_id=str(payload["From"]).replace("whatsapp:", ""),
                user_name=payload.get("ProfileName"),
                text=str(payload["Body"]).strip(),
                thread_id=None,
                raw=payload,
            )

        # Meta Cloud API webhook shape:
        try:
            entry = (payload.get("entry") or [{}])[0]
            change = (entry.get("changes") or [{}])[0]
            value = change.get("value", {})
            messages = value.get("messages") or []
            if not messages:
                return None
            msg = messages[0]
            text = (msg.get("text") or {}).get("body") or msg.get("body", "")
            if not text:
                return None
            return IncomingMessage(
                organization_id=settings.default_org_id,
                user_id=msg.get("from", "unknown"),
                user_name=(value.get("contacts") or [{}])[0].get("profile", {}).get("name"),
                text=text.strip(),
                thread_id=None,
                raw=payload,
            )
        except (IndexError, KeyError, TypeError):
            return None

    def format_response(self, answer: dict[str, Any]) -> dict[str, Any]:
        """Plain text reply for WhatsApp (Cloud API). Cards/buttons require
        approved templates — V2."""
        lines: list[str] = []
        if answer.get("insufficient_information"):
            lines.append("🟡 *No tengo eso todavía.*")
        lines.append(answer.get("summary", ""))

        person = answer.get("person_to_contact") or {}
        if person.get("name"):
            line = f"\n*Contactá a:* {person['name']}"
            if person.get("role"):
                line += f" — {person['role']}"
            if person.get("email"):
                line += f"\n📧 {person['email']}"
            lines.append(line)

        if answer.get("procedure"):
            lines.append(f"\n*Cómo:* {answer['procedure']}")

        follow_ups = answer.get("follow_ups") or []
        if follow_ups:
            lines.append("\n_¿Querés saber también...?_")
            for fu in follow_ups[:3]:
                lines.append(f"• {fu['text']}")

        return {"messaging_product": "whatsapp", "type": "text", "text": {"body": "\n".join(lines)}}
