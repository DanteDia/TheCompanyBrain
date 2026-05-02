"""CLI: ask the Company Brain a question.

Usage:
    python -m backend.scripts.ask "¿A quién le pido acceso a Salesforce?"
    python -m backend.scripts.ask --skills-file out.json "..."

If --skills-file is given, loads from disk (no Supabase). Otherwise loads
from Supabase using DEFAULT_ORG_ID.
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
from backend.models.schemas import SkillsFile


def _print_answer(query: str, answer: dict) -> None:
    print("\n" + "=" * 70)
    print(f"QUERY: {query}")
    print("=" * 70)

    insuf = answer.get("insufficient_information")
    flag = "🟡 INSUFFICIENT INFO" if insuf else "✅"
    print(f"\n{flag}\n")
    print(f"{answer['summary']}\n")

    person = answer.get("person_to_contact")
    if person:
        print(f"  contact: {person['name']} — {person.get('role') or ''} ({person.get('area') or ''})")
        if person.get("email"):
            print(f"           email: {person['email']}")
        if person.get("phone"):
            print(f"           phone: {person['phone']}")

    if answer.get("procedure"):
        print(f"\n  how: {answer['procedure']}")
    if answer.get("sla"):
        print(f"  sla: {answer['sla']}")

    if answer.get("citations"):
        print("\nCITATIONS:")
        for c in answer["citations"]:
            speaker = f"{c.get('speaker', '')} · " if c.get("speaker") else ""
            print(f'  [{c["entity_type"]}/{c["entity_id"]}] {speaker}"{c["quote"]}"')

    if answer.get("follow_ups"):
        print("\nFOLLOW-UPS:")
        for f in answer["follow_ups"]:
            print(f"  → {f['text']}")

    print()


async def ask(query: str, skills_file_path: Optional[Path]) -> dict:
    if skills_file_path:
        skills = SkillsFile.model_validate(
            json.loads(skills_file_path.read_text(encoding="utf-8"))
        )
    else:
        from backend.utils.supabase_client import load_skills_file

        skills = load_skills_file(settings.default_org_id)
        if not skills:
            raise RuntimeError(
                f"No Skills File for org={settings.default_org_id}. "
                f"Run `python -m backend.scripts.build_brain` first."
            )
    return await answer_query(query=query, skills_file=skills)


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("query", help="The question to ask the Brain")
    parser.add_argument(
        "--skills-file",
        type=Path,
        default=None,
        help="Local Skills File JSON (skip Supabase load)",
    )
    args = parser.parse_args(argv)

    answer = asyncio.run(ask(args.query, args.skills_file))
    _print_answer(args.query, answer)
    return 0


if __name__ == "__main__":
    sys.exit(main())
