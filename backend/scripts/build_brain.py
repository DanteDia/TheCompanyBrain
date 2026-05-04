"""CLI: ingest org chart + sample interview transcripts → write Skills File.

Usage:
    python -m backend.scripts.build_brain                  # uses sample_data/
    python -m backend.scripts.build_brain --no-persist     # skip Supabase write
    python -m backend.scripts.build_brain --transcripts X.json Y.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from backend.agents.post_interview import process_interview
from backend.config import settings
from backend.models.schemas import SkillsFile
from backend.utils.merge import merge_extraction_into_skills_file
from backend.utils.org_chart_loader import load_org_chart
from backend.utils.transcript_loader import load_synthetic_transcript

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ORG_CHART = ROOT / "sample_data" / "org_chart.csv"
DEFAULT_INTERVIEWS_DIR = ROOT / "sample_data" / "interviews"


async def build_brain(
    *,
    org_id: str,
    org_chart_path: Path,
    transcript_paths: list[Path],
    persist: bool,
) -> SkillsFile:
    print(f"\n=== Building Skills File for {org_id} ===\n")

    # Seed from org chart
    people = load_org_chart(org_chart_path)
    skills = SkillsFile(
        organization_id=org_id,
        organization_name="Blur Bank",
        generated_at=datetime.now(timezone.utc),
    )
    merge_extraction_into_skills_file(skills, people=people)
    skills.coverage.total_employees = len(people)
    print(f"[org chart] seeded {len(people)} people")

    # Process each transcript
    for path in transcript_paths:
        print(f"\n[transcript] processing {path.name} ...")
        payload = load_synthetic_transcript(path)
        employee_id = payload.get("employee_id") or ""
        existing = skills.person(employee_id)
        skeleton = (
            existing.model_dump(include={"id", "name", "role", "area", "email"})
            if existing
            else {"id": employee_id, "name": payload.get("employee_name", "")}
        )
        result = await process_interview(
            call_id=payload["call_id"],
            employee_skeleton=skeleton,
            transcript=payload["transcript"],
            skills_file=skills,
        )
        ext = result["extraction"]
        print(
            f"  → people={len(ext.get('people', []))} "
            f"tools={len(ext.get('tools', []))} "
            f"access_paths={len(ext.get('access_paths', []))} "
            f"processes={len(ext.get('processes', []))} "
            f"ticket_types={len(ext.get('ticket_types', []))} "
            f"glossary={len(ext.get('glossary', []))} "
            f"informal_rules={len(ext.get('informal_rules', []))} "
            f"relationships={len(ext.get('relationships', []))}"
        )

    print(
        f"\n=== Skills File built ===\n"
        f"  people:          {len(skills.people)}\n"
        f"  tools:           {len(skills.tools)}\n"
        f"  access_paths:    {len(skills.access_paths)}\n"
        f"  processes:       {len(skills.processes)}\n"
        f"  ticket_types:    {len(skills.ticket_types)}\n"
        f"  glossary:        {len(skills.glossary)}\n"
        f"  informal_rules:  {len(skills.informal_rules)}\n"
        f"  relationships:   {len(skills.relationships)}\n"
        f"  coverage:        {skills.coverage.interviewed}/{skills.coverage.total_employees} "
        f"({skills.coverage.pct:.0%})\n"
    )

    if persist:
        try:
            from backend.utils.supabase_client import save_skills_file

            save_skills_file(skills)
            print(f"[supabase] saved skills_file for org={org_id}")
        except Exception as exc:
            print(f"[supabase] WARNING — could not save: {exc}")
            print("  (continuing — Skills File was built locally)")

    return skills


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Build the Company Brain Skills File.")
    parser.add_argument("--org-id", default=settings.default_org_id)
    parser.add_argument(
        "--org-chart", type=Path, default=DEFAULT_ORG_CHART, help="Path to org_chart.csv"
    )
    parser.add_argument(
        "--transcripts",
        nargs="*",
        type=Path,
        default=None,
        help="Paths to interview transcript JSONs. Defaults to sample_data/interviews/*.json",
    )
    parser.add_argument(
        "--no-persist",
        action="store_true",
        help="Don't write to Supabase; just print + dump JSON locally.",
    )
    parser.add_argument(
        "--dump", type=Path, default=None, help="Optional path to dump SkillsFile JSON."
    )
    args = parser.parse_args(argv)

    transcripts = args.transcripts
    if not transcripts:
        transcripts = sorted(DEFAULT_INTERVIEWS_DIR.glob("interview_*.json"))

    skills = asyncio.run(
        build_brain(
            org_id=args.org_id,
            org_chart_path=args.org_chart,
            transcript_paths=list(transcripts),
            persist=not args.no_persist,
        )
    )

    if args.dump:
        args.dump.write_text(
            json.dumps(skills.model_dump(mode="json"), ensure_ascii=False, indent=2)
        )
        print(f"[dump] wrote {args.dump}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
