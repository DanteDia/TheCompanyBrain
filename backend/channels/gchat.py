"""Google Chat channel — webhook + Card v2 response.

Receives Google Chat events at /channels/gchat/webhook. We handle:
    - MESSAGE: user wrote in DM or @mentioned the bot in a space
    - ADDED_TO_SPACE: silent ack (V1.5: send onboarding tour message)
    - REMOVED_FROM_SPACE: silent ack

Response format: Card v2 with the answer + citations + follow-ups buttons.
For setup, a Google Chat app is registered in the same GCP project as the
Calendar service account; webhook URL is `<render>/channels/gchat/webhook`.
"""

from __future__ import annotations

from typing import Any, Optional

from backend.channels.base import ChannelAdapter, IncomingMessage
from backend.config import settings


class GoogleChatChannel(ChannelAdapter):
    name = "gchat"

    def parse_inbound(self, payload: dict[str, Any]) -> Optional[IncomingMessage]:
        evt = payload.get("type") or payload.get("eventType")
        if evt != "MESSAGE":
            return None  # ignore add/remove/silent events for V1
        msg = payload.get("message") or {}
        text = (msg.get("argumentText") or msg.get("text") or "").strip()
        if not text:
            return None
        sender = msg.get("sender", {}) or {}
        space = payload.get("space", {}) or {}
        return IncomingMessage(
            organization_id=settings.default_org_id,  # V2: map space → org
            user_id=sender.get("email") or sender.get("name") or "unknown",
            user_name=sender.get("displayName"),
            text=text,
            thread_id=(msg.get("thread") or {}).get("name"),
            raw=payload,
        )

    def format_response(self, answer: dict[str, Any]) -> dict[str, Any]:
        """Card v2 layout: header (status), main text (summary), contact card,
        citations expandable, follow-up button suggestions."""
        insuf = bool(answer.get("insufficient_information"))
        header_title = "Brain · 🟡 No tengo eso todavía" if insuf else "Brain"
        sections: list[dict[str, Any]] = [
            {"widgets": [{"textParagraph": {"text": answer.get("summary", "")}}]}
        ]

        person = answer.get("person_to_contact") or {}
        if person.get("name"):
            contact_widgets: list[dict[str, Any]] = [
                {
                    "decoratedText": {
                        "topLabel": person.get("role", ""),
                        "text": person["name"],
                        "bottomLabel": person.get("area", ""),
                    }
                }
            ]
            if person.get("email"):
                contact_widgets.append(
                    {"decoratedText": {"topLabel": "Email", "text": person["email"]}}
                )
            sections.append({"widgets": contact_widgets})

        if answer.get("procedure"):
            sections.append(
                {"widgets": [{"textParagraph": {"text": f"<b>Cómo</b><br>{answer['procedure']}"}}]}
            )

        citations = answer.get("citations") or []
        if citations:
            sections.append(
                {
                    "header": "Citas",
                    "collapsible": True,
                    "widgets": [
                        {
                            "textParagraph": {
                                "text": "<br>".join(
                                    f"· <i>{c.get('quote', '')}</i>"
                                    + (f" — {c.get('speaker')}" if c.get("speaker") else "")
                                    for c in citations
                                )
                            }
                        }
                    ],
                }
            )

        follow_ups = answer.get("follow_ups") or []
        if follow_ups:
            buttons = [
                {
                    "text": fu["text"],
                    "onClick": {
                        "action": {
                            "function": "ask_followup",
                            "parameters": [{"key": "q", "value": fu["text"]}],
                        }
                    },
                }
                for fu in follow_ups[:3]
            ]
            sections.append({"widgets": [{"buttonList": {"buttons": buttons}}]})

        return {
            "cardsV2": [
                {
                    "cardId": "brain-answer",
                    "card": {
                        "header": {"title": header_title},
                        "sections": sections,
                    },
                }
            ]
        }
