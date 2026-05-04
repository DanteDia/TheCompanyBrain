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

        # NOTE: Citations and follow-up question buttons are intentionally
        # OMITTED from Slack responses.
        #   Citations — surface interview transcripts/speakers, which is
        #     sensitive employee data. Privacy boundary: keep them in the web
        #     /ask UI where the audience is admins, not in DM channels.
        #   Follow-ups — competed with the create-ticket CTA below and made
        #     the message feel like an interrogation ("how many licences?"
        #     etc). Slack stays focused: answer + person + action.

        # Plain-text fallback for notifications and accessibility
        fallback = summary or "Respuesta del Brain"
        return {"blocks": blocks, "text": fallback[:300]}

    # ── Outbound (delivery) ──────────────────────────────────────────────────

    @staticmethod
    def thinking_payload() -> dict[str, Any]:
        """Block Kit for the placeholder posted while the agent is working.

        Posted in <1s so the user sees activity instantly. We then `chat.update`
        this same message with the real answer once the agent finishes.
        """
        return {
            "blocks": [
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": ":brain: *Pensando…*"}
                    ],
                }
            ],
            "text": "Pensando…",
        }

    async def post_message(
        self,
        *,
        channel: str,
        payload: dict[str, Any],
        thread_ts: Optional[str] = None,
    ) -> dict[str, Any]:
        """Post a Block Kit payload to Slack via chat.postMessage.

        Returns the full Slack API response (includes `ts`, used by
        update_message to edit the same message later).
        """
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

    async def update_message(
        self,
        *,
        channel: str,
        ts: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """Edit an existing message via chat.update.

        Used to swap a "Pensando…" placeholder with the final answer once the
        agent finishes. `ts` comes from the `post_message` response.
        `chat:write` scope is sufficient (same as posting).
        """
        token = settings.slack_bot_token
        if not token:
            raise RuntimeError("SLACK_BOT_TOKEN not configured")
        body: dict[str, Any] = {
            "channel": channel,
            "ts": ts,
            "blocks": payload.get("blocks", []),
            "text": payload.get("text") or "Respuesta del Brain",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{SLACK_API}/chat.update",
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
