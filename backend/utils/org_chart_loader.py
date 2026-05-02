"""Load an organization chart CSV → seed list of Person entities.

Expected CSV columns (case-insensitive, in any order):
    id, name, email, role, area, manager_id, phone

`id` should be a snake_case stable id (e.g. "ana_lopez"). If missing, we
generate it from the name. The seed Person has empty expertise/projects/
collaborators — those get filled in by the post-interview agent.
"""

from __future__ import annotations

import csv
import re
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Iterable, Union

from backend.models.schemas import EvidenceSpan, Person


def _slug(name: str) -> str:
    s = re.sub(r"[^\w\s]", "", name.lower())
    s = re.sub(r"\s+", "_", s.strip())
    return s or "unknown"


def _row_to_person(row: dict[str, str], source_id: str) -> Person:
    name = (row.get("name") or "").strip()
    if not name:
        raise ValueError(f"org_chart row missing 'name': {row}")
    pid = (row.get("id") or "").strip() or _slug(name)
    return Person(
        id=pid,
        name=name,
        role=(row.get("role") or "").strip(),
        area=(row.get("area") or "").strip(),
        email=(row.get("email") or "").strip() or None,
        phone=(row.get("phone") or "").strip() or None,
        manager_id=(row.get("manager_id") or "").strip() or None,
        evidence=[
            EvidenceSpan(
                source_type="org_chart",
                source_id=source_id,
                quote=f"{name} — {row.get('role', '').strip()} ({row.get('area', '').strip()})",
            )
        ],
    )


def _normalize_keys(row: dict[str, str]) -> dict[str, str]:
    return {k.strip().lower(): (v or "").strip() for k, v in row.items()}


def load_org_chart(source: Union[str, Path]) -> list[Person]:
    """Load a CSV file path."""
    path = Path(source)
    return load_org_chart_from_text(path.read_text(encoding="utf-8"), source_id=path.name)


def load_org_chart_from_text(text: str, *, source_id: str = "org_chart.csv") -> list[Person]:
    """Load CSV from raw text (e.g. uploaded via API)."""
    reader = csv.DictReader(StringIO(text))
    rows: Iterable[dict[str, str]] = (
        _normalize_keys(r) for r in reader if any((r or {}).values())
    )
    people = [_row_to_person(r, source_id) for r in rows]
    _wire_direct_reports(people)
    return people


def _wire_direct_reports(people: list[Person]) -> None:
    """Populate `direct_reports` on managers based on `manager_id` of others."""
    by_id = {p.id: p for p in people}
    for p in people:
        if p.manager_id and p.manager_id in by_id:
            mgr = by_id[p.manager_id]
            if p.id not in mgr.direct_reports:
                mgr.direct_reports.append(p.id)
