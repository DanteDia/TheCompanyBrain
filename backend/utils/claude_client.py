"""Anthropic SDK wrapper.

Centralizes:
    - retry with exponential backoff (tenacity)
    - automatic fallback claude-opus-4-7 → claude-opus-4-6 on model-not-found
    - prompt caching helpers
    - structlog setup
    - tool_use extraction utilities

All agents import `call_with_retry` from here. Never use `anthropic.Anthropic()`
directly elsewhere — it bypasses retry + fallback.
"""

from __future__ import annotations

import logging
import sys
from typing import Any, Optional

import anthropic
import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from backend.config import settings


# ─── Logging setup ───────────────────────────────────────────────────────────

logging.basicConfig(level=getattr(logging, settings.log_level), stream=sys.stdout)
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.dict_tracebacks,
        structlog.processors.JSONRenderer()
        if settings.is_production
        else structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, settings.log_level)
    ),
)
log = structlog.get_logger("claude_client")


# ─── Singleton client ────────────────────────────────────────────────────────

_client: Optional[anthropic.Anthropic] = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Get one from console.anthropic.com "
                "and add it to your .env (or Render env vars in production)."
            )
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


# ─── Retry + fallback wrapper ────────────────────────────────────────────────

_RETRYABLE = (
    anthropic.APIConnectionError,
    anthropic.APITimeoutError,
    anthropic.RateLimitError,
    anthropic.InternalServerError,
)


@retry(
    reraise=True,
    retry=retry_if_exception_type(_RETRYABLE),
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=1, max=20),
)
def _call(model: str, **kwargs: Any) -> anthropic.types.Message:
    return get_client().messages.create(model=model, **kwargs)


def call_with_retry(
    model: str,
    *,
    fallback_model: Optional[str] = None,
    **kwargs: Any,
) -> anthropic.types.Message:
    """Make a Claude call with retry + automatic model fallback.

    If the requested model returns a NotFoundError (e.g. "model not found"), we
    automatically retry with `fallback_model`. Useful while claude-opus-4-7
    rolls out — falls back to claude-opus-4-6 if needed.
    """
    try:
        return _call(model=model, **kwargs)
    except anthropic.NotFoundError as e:
        target = fallback_model or _default_fallback(model)
        if target and target != model:
            log.warning(
                "claude.model_fallback",
                requested=model,
                fallback=target,
                error=str(e),
            )
            return _call(model=target, **kwargs)
        raise
    except anthropic.BadRequestError as e:
        # Anthropic sometimes returns BadRequest for unknown model strings.
        if "model" in str(e).lower() and (fallback_model or _default_fallback(model)):
            target = fallback_model or _default_fallback(model)
            if target and target != model:
                log.warning(
                    "claude.model_fallback_bad_request",
                    requested=model,
                    fallback=target,
                    error=str(e),
                )
                return _call(model=target, **kwargs)
        raise


def _default_fallback(model: str) -> Optional[str]:
    """Heuristic fallback when callers don't pass fallback_model explicitly."""
    if model == settings.model_qa or model == settings.model_extractor:
        return settings.model_qa_fallback
    if "opus-4-7" in model:
        return model.replace("opus-4-7", "opus-4-6")
    if "sonnet-4-6" in model:
        return model.replace("sonnet-4-6", "sonnet-4-5")
    return None


# ─── Tool-use helpers ────────────────────────────────────────────────────────


def extract_tool_use(
    message: anthropic.types.Message, tool_name: str
) -> dict[str, Any]:
    """Pull the input dict from the first tool_use block matching `tool_name`.

    Raises if the tool wasn't called. Use this when you forced tool_choice on
    the call — every successful response should have the tool block.
    """
    for block in message.content:
        if block.type == "tool_use" and block.name == tool_name:
            return dict(block.input)
    raise ValueError(
        f"Tool '{tool_name}' was not called in the response. "
        f"Got blocks: {[b.type for b in message.content]}"
    )


def extract_thinking(message: anthropic.types.Message) -> Optional[str]:
    """Pull the extended thinking block, if present."""
    for block in message.content:
        if getattr(block, "type", None) == "thinking":
            return getattr(block, "thinking", None)
    return None


def cached_system(text: str) -> dict[str, Any]:
    """Wrap a system prompt with prompt-caching enabled.

    Use for any system prompt that is identical across many calls (the agent
    system prompts, the Skills File context block in Q&A).
    """
    return {"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}


def cached_text_block(text: str) -> dict[str, Any]:
    """Wrap a user message text block with prompt-caching."""
    return {"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}
