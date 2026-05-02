"""Run the 8 eval cases against the Q&A agent. Hard gate before any deploy.

Usage:
    python -m backend.eval.run_eval                       # uses Supabase Skills File
    python -m backend.eval.run_eval --skills-file X.json  # local, no Supabase
    python -m backend.eval.run_eval --case access_path_salesforce  # one case

Exit codes:
    0 — all cases passed
    1 — one or more cases failed
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Optional

from backend.agents.qa_agent import answer_query
from backend.config import settings
from backend.eval.cases import EVAL_CASES
from backend.models.schemas import SkillsFile


async def run(skills_file_path: Optional[Path], case_filter: Optional[str]) -> int:
    if skills_file_path:
        skills = SkillsFile.model_validate(
            json.loads(skills_file_path.read_text(encoding="utf-8"))
        )
        print(f"[eval] using local Skills File: {skills_file_path}")
    else:
        from backend.utils.supabase_client import load_skills_file

        skills = load_skills_file(settings.default_org_id)
        if not skills:
            print(
                f"[eval] FAIL — no Skills File for org={settings.default_org_id}. "
                f"Run build_brain first."
            )
            return 1
        print(f"[eval] using Supabase Skills File for org={settings.default_org_id}")

    cases = EVAL_CASES
    if case_filter:
        cases = [c for c in EVAL_CASES if c["name"] == case_filter]
        if not cases:
            print(f"[eval] no case named {case_filter!r}")
            return 1

    print(f"[eval] running {len(cases)} cases\n")
    passed = 0
    failed: list[tuple[str, str]] = []

    for case in cases:
        name = case["name"]
        query = case["query"]
        try:
            answer = await answer_query(query=query, skills_file=skills)
            ok, reason = case["check"](answer, skills)
        except Exception as exc:  # noqa: BLE001
            ok, reason = False, f"exception: {exc}"
            answer = {}

        status = "✅" if ok else "❌"
        print(f"{status}  {name}")
        print(f"     Q: {query}")
        if answer:
            summary_preview = (answer.get("summary", "") or "")[:120]
            print(f"     A: {summary_preview}")
        print(f"     →  {reason}\n")
        if ok:
            passed += 1
        else:
            failed.append((name, reason))

    total = len(cases)
    print(f"\n{'=' * 70}\n[eval] {passed}/{total} passed")
    if failed:
        print("\nFAILED:")
        for name, reason in failed:
            print(f"  - {name}: {reason}")
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skills-file", type=Path, default=None)
    parser.add_argument("--case", type=str, default=None, help="Run a single case by name")
    args = parser.parse_args()
    return asyncio.run(run(args.skills_file, args.case))


if __name__ == "__main__":
    sys.exit(main())
