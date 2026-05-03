"""Slack channel — webhook + Block Kit response.

Receives Slack events at /channels/slack/events. We handle:
    - url_verification: Slack initial setup challenge → echo back challenge
    - app_mention: someone @-mentioned the bot in a channel
    - message.im: direct message to the bot

Response format: Block Kit message posted via chat.postMessage Web API.
Slack requires a 200 OK within 3s, so we ack immediately and post the
answer back asynchronously (background task in main.py).

Setup: see backend/channels/SLACK.md.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import time
from typing import Any, Optional

import httpx

from backend.channels.base import ChannelAdapter, IncomingMessage
from backend.config import settings

SLACK_API = "https://slack.com/api"
_MENTION_RE = re.compile(r"<@[A-Z0-9]+>")


class SlackChannel(ChannelAdapter):
    name = "slack"

    # ── Security ─────────────────────────────────────────────────────────────

    def verify_signature(self, body: bytes, timestamp: str, signature: str) -> bool:
        """Verify the request came from Slack using the signing secret.

        Slack docs: https://api.slack.com/authentication/verifying-requests-from-slack
        """
        secret = (settings.slack_signing_secret or "").encode()
        if not secret or not timestamp or not signature:
            return False
        try:
            ts_int = int(timestamp)
        except (TypeError, ValueError):
            return False
        # Reject replays older than 5 minutes
        if abs(time.time() - ts_int) > 60 * 5:
            return False
        sig_basestring = b"v0:" + timestamp.encode() + b":" + body
        my_sig = "v0=" + hmac.new(secret, sig_basestring, hashlib.sha256).hexdigest()
        return hmac.compare_digest(my_sig, signature)

    # ── Inbound ──────────────────────────────────────────────────────────────

    def parse_inbound(self, payload: dict[str, Any]) -> Optional[IncomingMessage]:
        event = payload.get("event") or {}
        et = event.get("type")
        if et not in ("app_mention", "message"):
            return None
        # Filter out bot's own messages, edits, deletes, channel joins…
        if event.get("subtype") in (
            "bot_message",
            "message_changed",
            "message_deleted",
            "channel_join",
            "channel_leave",
        ):
            return None
        if event.get("bot_id"):
            return None
        # For raw "message" events, only respond in DMs (channel_type == "im").
        # @-mentions in channels come as "app_mention" so they're handled there.
        if et == "message" and event.get("channel_type") != "im":
            return None
        text = (event.get("text") or "").strip()
        if et == "app_mention":
            text = _MENTION_RE.sub("", text).strip()
        if not text:
            return None
        return IncomingMessage(
            organization_id=settings.default_org_id,  # V2: map team_id → org
            user_id=event.get("user") or "unknown",
            user_name=None,
            text=text,
            thread_id=event.get("thread_ts") or event.get("ts"),
            raw=payload,
        )

    # ── Outbound (formatting) ────────────────────────────────────────────────

    def format_response(self, answer: dict[str, Any]) -> dict[str, Any]:
        """Build a Slack Block Kit payload from the Q&A Answer."""
        insuf = bool(answer.get("insufficient_information"))
        blocks: list[dict[str, Any]] = []

        # Header chip
        chip = ":warning: Conocimiento incompleto" if insuf else ":bulb: Brain"
        blocks.append(
            {
                "type": "context",
                "elements": [{"type": "mrkdwn", "text": f"*{chip}*"}],
            }
        )

        # Main answer
        summary = answer.get("summary") or ""
        if summary:
            blocks.append(
                {"type": "section", "text": {"type": "mrkdwn", "text": summary}}
            )

        # Person card
        person = answer.get("person_to_contact") or {}
        if person.get("name"):
            lines = [f"*{person['name']}*"]
            sub = " · ".join(filter(None, [person.get("role"), person.get("area")]))
            if sub:
                lines.append(f"_{sub}_")
            if person.get("email"):
                lines.append(f":email: `{person['email']}`")
            if person.get("phone"):
                lines.append(f":telephone_receiver: `{person['phone']}`")
            blocks.append(
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "\n".join(lines)},
                }
            )

        # Procedure
        if answer.get("procedure"):
            blocks.append(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Cómo:* {answer['procedure']}",
                    },
                }
            )

        # SLA
        if answer.get("sla"):
            blocks.append(
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f":hourglass: SLA · {answer['sla']}"}
                    ],
                }
            )

        # Citations (collapsed-ish: just first 2 quotes inline)
        citations = answer.get("citations") or []
        if citations:
            quotes = "\n".join(
                f"> _{c.get('quote', '')[:120]}_"
                + (f" — {c.get('speaker')}" if c.get("speaker") else "")
                for c in citations[:2]
            )
            blocks.append(
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f"*Citas*\n{quotes}"}
                    ],
                }
            )

        # Follow-up suggestions as buttons
        follow_ups = answer.get("follow_ups") or []
        if follow_ups:
            buttons = [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": (fu.get("text") or "")[:75],
                        "emoji": True,
                    },
                    "action_id": f"followup_{i}",
                    "value": (fu.get("text") or "")[:2000],
                }
                for i, fu in enumerate(follow_ups[:3])
                if fu.get("text")
            ]
            if buttons:
                blocks.append({"type": "actions", "elements": buttons})

        # Plain-text fallback for notifications and accessibility
        fallback = summary or "Respuesta del Brain"
        return {"blocks": blocks, "text": fallback[:300]}

    # ── Outbound (delivery) ──────────────────────────────────────────────────

    async def post_message(
        self,
        *,
        channel: str,
        payload: dict[str, Any],
        thread_ts: Optional[str] = None,
    ) -> dict[str, Any]:
        """Post a Block Kit payload to Slack via chat.postMessage."""
        token = settings.slack_bot_token
        if not token:
            raise RuntimeError("SLACK_BOT_TOKEN not configured")
        body: dict[str, Any] = {
            "channel": channel,
            "blocks": payload.get("blocks", []),
            "text": payload.get("text") or "Respuesta del Brain",
        }
        if thread_ts:
            body["thread_ts"] = thread_ts
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{SLACK_API}/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json; charset=utf-8",
                },
                json=body,
            )
        r.raise_for_status()
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(f"Slack API error: {data.get('error')!r}")
        return data
