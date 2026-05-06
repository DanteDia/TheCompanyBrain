"""Lightweight Haiku-based extractor for /try demo calls.

The full post-interview pipeline is too heavy for a public demo —
it writes to the org skills file, runs Opus, and invokes tools. For
demo calls we want a fast/cheap/non-persistent extraction that just
returns the structured nodes the agent picked up, used to populate
the post-call Review modal where the visitor verifies what was
captured (especially names of people and tools).
"""
from __future__ import annotations

import json
import re
from typing import Any

import structlog

from backend.config import settings
from backend.utils.claude_client import call_with_retry

log = structlog.get_logger()

EXTRACTION_PROMPT = """Extract concrete pieces of knowledge from this employee interview transcript.

Categorize each into exactly ONE of:
  - tool    (a software, system, platform, or app referenced by name — Salesforce, SharePoint, Slack, Jira, etc.)
  - person  (a coworker referenced by name — full name preferred, plus role if mentioned)
  - process (a workflow, procedure, or recurring activity — onboarding flow, ticket escalation, weekly review)
  - rule    (an unwritten norm or convention — "we never email Bloomberg directly", "tickets after 6pm wait until next day")

Output strict JSON, no surrounding prose, no code fences:
{
  "contributions": [
    {"type": "tool", "label_en": "Salesforce", "label_es": "Salesforce"},
    {"type": "person", "label_en": "Mariana Torres (CEO)", "label_es": "Mariana Torres (CEO)"}
  ]
}

Constraints:
- Limit to 6-8 most distinctive items. Prefer named entities (people, specific tools) over abstract concepts.
- Provide BOTH English and Spanish labels. If the label is a proper noun (a person's name, a product name like "Salesforce"), keep it identical in both.
- If something is ambiguous, omit it rather than guessing.
- Do not include the agent's questions — only what the EMPLOYEE said.

Persona context: the employee is {role} in {area}.

Transcript:
{transcript}"""


def _parse_response(text: str) -> list[dict[str, Any]]:
    """Extract the JSON object from the LLM response, robust to code fences and prose."""
    cleaned = text.strip()
    # Strip markdown code fences
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1)
    else:
        # Or take the first balanced { ... }
        start = cleaned.find("{")
        if start >= 0:
            depth = 0
            for i in range(start, len(cleaned)):
                if cleaned[i] == "{":
                    depth += 1
                elif cleaned[i] == "}":
                    depth -= 1
                    if depth == 0:
                        cleaned = cleaned[start : i + 1]
                        break
    try:
        data = json.loads(cleaned)
    except Exception as e:
        log.warning("demo_extractor.parse_failed", error=str(e), preview=text[:200])
        return []
    raw = data.get("contributions") or []
    out: list[dict[str, Any]] = []
    valid_types = {"tool", "person", "process", "rule"}
    for c in raw:
        t = c.get("type")
        if t not in valid_types:
            continue
        en = (c.get("label_en") or "").strip()
        es = (c.get("label_es") or en).strip()
        if not en:
            continue
        out.append({"type": t, "label": {"en": en, "es": es}})
    return out[:8]


def extract_demo_contributions(
    *,
    transcript: str,
    role: str = "",
    area: str = "",
) -> list[dict[str, Any]]:
    """Run Haiku on the call transcript and return structured contributions.

    Returns an empty list on any failure — the frontend falls back to the
    curated mock contributions when this returns nothing.
    """
    if not transcript or len(transcript.strip()) < 60:
        return []
    try:
        response = call_with_retry(
            settings.model_router,  # haiku — fast + cheap
            fallback_model=settings.model_qa_fast_fallback,
            max_tokens=1200,
            messages=[
                {
                    "role": "user",
                    "content": (
                        EXTRACTION_PROMPT
                        .replace("{role}", role or "employee")
                        .replace("{area}", area or "their area")
                        .replace("{transcript}", transcript[:8000])
                    ),
                }
            ],
        )
    except Exception as e:
        log.warning("demo_extractor.api_call_failed", error=str(e))
        return []

    text = ""
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text += getattr(block, "text", "") or ""
        elif hasattr(block, "text"):
            text += block.text or ""
    contributions = _parse_response(text)
    log.info(
        "demo_extractor.completed",
        n_contributions=len(contributions),
        transcript_chars=len(transcript),
    )
    return contributions



def _diagnose(*, transcript: str, role: str = "", area: str = "") -> dict[str, Any]:
    """Same as extract_demo_contributions but returns the raw model text
    and any parsing intermediate state. Pure debug — not for prod use."""
    out: dict[str, Any] = {
        "input": {
            "transcript_chars": len(transcript or ""),
            "role": role,
            "area": area,
        },
    }
    if not transcript or len(transcript.strip()) < 60:
        out["error"] = "transcript too short (<60 chars)"
        return out
    try:
        response = call_with_retry(
            settings.model_router,
            fallback_model=settings.model_qa_fast_fallback,
            max_tokens=1200,
            messages=[
                {
                    "role": "user",
                    "content": (
                        EXTRACTION_PROMPT
                        .replace("{role}", role or "employee")
                        .replace("{area}", area or "their area")
                        .replace("{transcript}", transcript[:8000])
                    ),
                }
            ],
        )
    except Exception as e:
        out["error"] = f"call_with_retry exception: {type(e).__name__}: {e}"
        return out

    text = ""
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text += getattr(block, "text", "") or ""
        elif hasattr(block, "text"):
            text += block.text or ""
    out["raw_text"] = text
    out["raw_text_chars"] = len(text)
    parsed = _parse_response(text)
    out["parsed_contributions"] = parsed
    out["parsed_count"] = len(parsed)
    return out
