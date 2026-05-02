"""ChannelAdapter — pluggable interface for every Q&A entry point.

Every channel (web, Google Chat, WhatsApp, Slack...) implements the same 3
methods. The Q&A engine is channel-agnostic. To add a new channel:

    1. subclass ChannelAdapter
    2. parse_inbound: incoming payload → IncomingMessage
    3. format_response: Answer dict → channel-native payload
    4. send_proactive (optional): for things like "schedule the interview"

Routes are registered in backend/main.py per channel.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class IncomingMessage:
    """Normalized inbound message regardless of channel."""

    organization_id: str
    user_id: str            # Channel-native user id (slack id, gchat email, etc.)
    user_name: Optional[str]
    text: str
    thread_id: Optional[str]
    raw: dict[str, Any]


class ChannelAdapter(ABC):
    """Pluggable channel handler."""

    name: str = "base"

    @abstractmethod
    def parse_inbound(self, payload: dict[str, Any]) -> Optional[IncomingMessage]:
        """Translate the channel's webhook payload to IncomingMessage.

        Return None to ignore the event (e.g. bot's own messages, edits, etc.).
        """

    @abstractmethod
    def format_response(self, answer: dict[str, Any]) -> dict[str, Any]:
        """Translate the Q&A Answer dict to a channel-native response payload."""

    async def send_proactive(
        self, *, user_id: str, message: str, **kwargs: Any
    ) -> None:
        """Optional — push a message into the channel without an inbound trigger."""
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support proactive messages."
        )
