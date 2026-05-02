"""Convert transcript payloads (Retell webhook OR synthetic JSON) to a canonical
format we feed to the post-interview agent.

Canonical format:
    [
        {"speaker": "agent" | "employee", "timestamp_seconds": float, "text": str},
        ...
    ]

Retell sends `role: "agent" | "user"` and `words` arrays in some versions — we
normalize both. Synthetic JSON for the demo already uses the canonical format.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Union


def normalize_retell_transcript(payload: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize Retell's variable transcript payload to our canonical form."""
    out: list[dict[str, Any]] = []
    for turn in payload:
        speaker = turn.get("role") or turn.get("speaker") or "unknown"
        # Retell uses "agent" / "user"; we use "agent" / "employee".
        if speaker == "user":
            speaker = "employee"

        # Some Retell payloads carry "words": [{"word": "...", "start": float}]
        if "words" in turn and isinstance(turn["words"], list) and turn["words"]:
            text = " ".join(w.get("word", "") for w in turn["words"]).strip()
            ts = float(turn["words"][0].get("start", 0.0))
        else:
            text = turn.get("text") or turn.get("content") or ""
            ts_raw = turn.get("timestamp_seconds") or turn.get("start") or 0.0
            ts = float(ts_raw)

        if not text:
            continue
        out.append({"speaker": speaker, "timestamp_seconds": ts, "text": text})
    return out


def load_synthetic_transcript(path: Union[str, Path]) -> dict[str, Any]:
    """Load one synthetic interview JSON (sample_data/interviews/*.json)."""
    return json.loads(Path(path).read_text(encoding="utf-8"))


def format_transcript_for_llm(transcript: list[dict[str, Any]]) -> str:
    """Render a transcript as readable text for the post-interview prompt."""
    lines: list[str] = []
    for turn in transcript:
        ts = turn.get("timestamp_seconds", 0.0)
        speaker = turn.get("speaker", "?").upper()
        text = turn.get("text", "")
        lines.append(f"[{ts:>7.2f}s {speaker:>9}] {text}")
    return "\n".join(lines)
