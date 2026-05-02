"""LLM client — supports BOTH Anthropic native and OpenRouter.

Provider selection: `LLM_PROVIDER` env var (default "auto").
- "anthropic"  → uses anthropic SDK. Full features: extended thinking, prompt
                 caching, cache_control system blocks. **Recommended.**
- "openrouter" → uses openai SDK pointed at openrouter.ai. Drops thinking +
                 caching automatically. Same code path for agents.
- "auto"       → anthropic if ANTHROPIC_API_KEY is set, else openrouter.

To keep the agents (post_interview, qa_agent, router) provider-agnostic we
return a normalized response that quacks like an `anthropic.types.Message`:
  - `.content` is a list of blocks
  - each block has a `.type` ("text" | "tool_use" | "thinking")
  - tool_use blocks have `.name` and `.input` (dict)
  - thinking blocks have `.thinking` (str)

So `extract_tool_use(message, "name")` works on both.

Trade-offs when on OpenRouter:
  - thinking={...}: silently dropped
  - cache_control: silently dropped
  - tool_choice: translated to OpenAI's "required tool" format
  - system as a list of blocks: collapsed to a single string
  - quality: typically a small dip on multi-step reasoning since extended
    thinking is gone. Cost: ~3x on repeat queries (no caching).
"""

from __future__ import annotations

import json
import logging
import sys
from dataclasses import dataclass, field
from typing import Any, Optional

import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from backend.config import settings


# ─── Logging ─────────────────────────────────────────────────────────────────

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
log = structlog.get_logger("llm_client")


# ─── Normalized response shape ───────────────────────────────────────────────


@dataclass
class TextBlock:
    text: str
    type: str = "text"


@dataclass
class ToolUseBlock:
    name: str
    input: dict[str, Any]
    type: str = "tool_use"
    id: str = ""


@dataclass
class ThinkingBlock:
    thinking: str
    type: str = "thinking"


@dataclass
class CompatMessage:
    """Looks like anthropic.types.Message — has .content list of blocks."""

    content: list[Any] = field(default_factory=list)
    stop_reason: Optional[str] = None
    raw: Any = None  # the underlying SDK response, for debugging


# ─── Anthropic native client ─────────────────────────────────────────────────

_anthropic_client = None


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic

        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY not set. Get one from console.anthropic.com or "
                "set LLM_PROVIDER=openrouter to use OpenRouter instead."
            )
        _anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


def _is_anthropic_retryable(exc: BaseException) -> bool:
    import anthropic

    return isinstance(
        exc,
        (
            anthropic.APIConnectionError,
            anthropic.APITimeoutError,
            anthropic.RateLimitError,
            anthropic.InternalServerError,
        ),
    )


@retry(
    reraise=True,
    retry=retry_if_exception_type(Exception),  # filtered inside via _is_anthropic_retryable
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=1, max=20),
)
def _call_anthropic_raw(model: str, **kwargs: Any):
    try:
        return _get_anthropic().messages.create(model=model, **kwargs)
    except Exception as e:  # noqa: BLE001
        if _is_anthropic_retryable(e):
            raise
        # Don't retry on auth, validation, etc.
        raise


def _call_anthropic(model: str, **kwargs: Any) -> CompatMessage:
    """Native Anthropic call. Preserves all features."""
    msg = _call_anthropic_raw(model=model, **kwargs)
    return CompatMessage(
        content=list(msg.content), stop_reason=msg.stop_reason, raw=msg
    )


# ─── OpenRouter client (OpenAI-compatible) ───────────────────────────────────

_openrouter_client = None


def _get_openrouter():
    global _openrouter_client
    if _openrouter_client is None:
        from openai import OpenAI

        if not settings.openrouter_api_key:
            raise RuntimeError(
                "OPENROUTER_API_KEY not set. Get one from openrouter.ai or set "
                "ANTHROPIC_API_KEY to use Anthropic native instead."
            )
        _openrouter_client = OpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            default_headers={
                "HTTP-Referer": settings.openrouter_app_url,
                "X-Title": settings.openrouter_app_name,
            },
        )
    return _openrouter_client


def _normalize_model_for_openrouter(model: str) -> str:
    """Map our internal model names to OpenRouter's namespace."""
    if "/" in model:
        return model  # already namespaced
    if model.startswith("claude-"):
        # claude-opus-4-7 → anthropic/claude-opus-4 (latest 4.x on OR)
        # claude-sonnet-4-6 → anthropic/claude-sonnet-4
        # claude-haiku-4-5 → anthropic/claude-haiku-4
        base = model.replace("claude-", "")
        # Drop the trailing patch version: opus-4-7 → opus-4
        parts = base.split("-")
        if len(parts) >= 2 and parts[-1].isdigit() and parts[-2].isdigit():
            base = "-".join(parts[:-1])
        return f"anthropic/claude-{base}"
    return model


def _system_to_string(system_param: Any) -> str:
    """Anthropic accepts list[{type, text, cache_control?}] — collapse to str."""
    if system_param is None:
        return ""
    if isinstance(system_param, str):
        return system_param
    if isinstance(system_param, list):
        return "\n\n".join(
            (b.get("text", "") if isinstance(b, dict) else str(b))
            for b in system_param
        )
    return str(system_param)


def _messages_to_openai(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Translate Anthropic messages format to OpenAI chat format."""
    out: list[dict[str, Any]] = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content")
        if isinstance(content, str):
            out.append({"role": role, "content": content})
            continue
        # Anthropic content blocks → flatten text blocks; ignore non-text for V1
        text_parts: list[str] = []
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict):
                    if block.get("type") == "text":
                        text_parts.append(block.get("text", ""))
                else:
                    text_parts.append(str(block))
        out.append({"role": role, "content": "\n\n".join(text_parts)})
    return out


def _tools_to_openai(anthropic_tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Translate Anthropic tool schema to OpenAI function-calling schema."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t.get("description", ""),
                "parameters": t["input_schema"],
            },
        }
        for t in anthropic_tools
    ]


def _tool_choice_to_openai(tc: Any) -> Any:
    """Translate Anthropic tool_choice to OpenAI."""
    if not tc:
        return "auto"
    if isinstance(tc, dict):
        if tc.get("type") == "tool" and tc.get("name"):
            return {"type": "function", "function": {"name": tc["name"]}}
        if tc.get("type") == "any":
            return "required"
        if tc.get("type") == "auto":
            return "auto"
    return "auto"


@retry(
    reraise=True,
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=1, max=20),
)
def _call_openrouter_raw(**kwargs):
    try:
        return _get_openrouter().chat.completions.create(**kwargs)
    except Exception as e:  # noqa: BLE001
        # OpenAI SDK raises various errors; retry on connection/rate-limit only
        s = str(e).lower()
        if any(k in s for k in ("rate limit", "timeout", "connection", "503", "502")):
            raise
        # Otherwise stop retrying
        raise


def _call_openrouter(model: str, **kwargs: Any) -> CompatMessage:
    """OpenRouter call. Drops thinking + caching; translates tools format."""
    # Strip features that don't translate
    kwargs.pop("thinking", None)
    system = _system_to_string(kwargs.pop("system", None))
    tools = kwargs.pop("tools", None)
    tool_choice = kwargs.pop("tool_choice", None)
    messages_in = kwargs.pop("messages", [])
    max_tokens = kwargs.pop("max_tokens", 4096)
    # Drop other Anthropic-specific kwargs that OpenAI doesn't recognize
    for k in ("stop_sequences", "metadata", "anthropic_beta"):
        kwargs.pop(k, None)

    or_messages = []
    if system:
        or_messages.append({"role": "system", "content": system})
    or_messages.extend(_messages_to_openai(messages_in))

    or_kwargs: dict[str, Any] = {
        "model": _normalize_model_for_openrouter(model),
        "messages": or_messages,
        "max_tokens": max_tokens,
    }
    if tools:
        or_kwargs["tools"] = _tools_to_openai(tools)
        or_kwargs["tool_choice"] = _tool_choice_to_openai(tool_choice)

    or_response = _call_openrouter_raw(**or_kwargs)

    # Build CompatMessage from OpenAI response
    blocks: list[Any] = []
    choice = or_response.choices[0]
    msg = choice.message

    if getattr(msg, "content", None):
        blocks.append(TextBlock(text=msg.content or ""))

    for tc in getattr(msg, "tool_calls", None) or []:
        try:
            args = json.loads(tc.function.arguments or "{}")
        except json.JSONDecodeError:
            args = {}
        blocks.append(
            ToolUseBlock(
                name=tc.function.name,
                input=args,
                id=getattr(tc, "id", "") or "",
            )
        )

    return CompatMessage(
        content=blocks, stop_reason=choice.finish_reason, raw=or_response
    )


# ─── Public API — provider-agnostic ──────────────────────────────────────────


def call_with_retry(
    model: str,
    *,
    fallback_model: Optional[str] = None,
    **kwargs: Any,
) -> CompatMessage:
    """Make an LLM call with retry + automatic model fallback. Routes to the
    configured provider (`LLM_PROVIDER` env var, default "auto").

    `fallback_model` triggers if the primary model returns NotFound /
    BadRequest about the model. Useful while opus-4-7 rolls out.
    """
    provider = settings.resolved_provider
    log.info("llm.call", provider=provider, model=model)

    try:
        if provider == "openrouter":
            return _call_openrouter(model, **kwargs)
        return _call_anthropic(model, **kwargs)
    except Exception as e:  # noqa: BLE001
        msg = str(e).lower()
        target = fallback_model or _default_fallback(model)
        # Fall back if the error mentions the model
        is_model_err = "model" in msg and (
            "not found" in msg or "does not exist" in msg or "invalid" in msg
        )
        if target and target != model and is_model_err:
            log.warning(
                "llm.model_fallback",
                requested=model,
                fallback=target,
                error=str(e),
            )
            if provider == "openrouter":
                return _call_openrouter(target, **kwargs)
            return _call_anthropic(target, **kwargs)
        raise


def _default_fallback(model: str) -> Optional[str]:
    if model == settings.model_qa or model == settings.model_extractor:
        return settings.model_qa_fallback
    if "opus-4-7" in model:
        return model.replace("opus-4-7", "opus-4-6")
    if "sonnet-4-6" in model:
        return model.replace("sonnet-4-6", "sonnet-4-5")
    return None


# ─── Tool-use + thinking helpers (provider-agnostic) ─────────────────────────


def extract_tool_use(message: CompatMessage, tool_name: str) -> dict[str, Any]:
    """Pull the input dict from the first tool_use block matching `tool_name`."""
    for block in message.content:
        if getattr(block, "type", None) == "tool_use" and getattr(
            block, "name", None
        ) == tool_name:
            return dict(block.input)
    raise ValueError(
        f"Tool '{tool_name}' was not called in the response. "
        f"Got blocks: {[getattr(b, 'type', '?') for b in message.content]}"
    )


def extract_thinking(message: CompatMessage) -> Optional[str]:
    for block in message.content:
        if getattr(block, "type", None) == "thinking":
            return getattr(block, "thinking", None)
    return None


def cached_system(text: str) -> dict[str, Any]:
    """Wrap a system prompt with prompt-caching enabled (Anthropic only).

    On OpenRouter the cache_control gets stripped — same behavior, just no
    cache hit benefit.
    """
    return {"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}


def cached_text_block(text: str) -> dict[str, Any]:
    return {"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}
