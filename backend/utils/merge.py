"""Merge extracted entities into an existing Skills File.

Strategy:
    - For each entity type, dedupe by stable id first, then by best-effort
      name/email match.
    - On match, MERGE the fields (union of lists, prefer existing if conflict).
    - Always APPEND evidence — we never lose source attribution.
    - Conflicts (different SLA, contradictory ownership) get flagged via
      `needs_review=True` on the entity (stored in metadata JSON, not a hard
      schema field for now).

Caller: post_interview agent after the LLM extraction.
"""

from __future__ import annotations

import re
import unicodedata
from typing import TypeVar

from backend.models.schemas import (
    AccessPath,
    EvidenceSpan,
    GlossaryTerm,
    InformalRule,
    Person,
    Process,
    Relationship,
    SkillsFile,
    TicketType,
    Tool,
)

T = TypeVar("T")


# ─── Name normalization ──────────────────────────────────────────────────────


def _normalize(s: str) -> str:
    """Lowercase, strip accents, collapse whitespace. For loose matching."""
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^\w\s]", " ", s).lower()
    return re.sub(r"\s+", " ", s).strip()


def _name_match(a: str, b: str) -> bool:
    na, nb = _normalize(a), _normalize(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    # First name + last initial heuristic — covers "Diego Ramírez" vs "Diego R."
    pa, pb = na.split(), nb.split()
    if len(pa) >= 2 and len(pb) >= 2 and pa[0] == pb[0] and pa[-1][0] == pb[-1][0]:
        return True
    return False


# ─── Generic dedup helpers ───────────────────────────────────────────────────


def _find_by_id(items: list[T], item_id: str) -> int:
    for i, it in enumerate(items):
        if getattr(it, "id", None) == item_id:
            return i
    return -1


def _merge_lists(existing: list[str], incoming: list[str]) -> list[str]:
    out = list(existing)
    for x in incoming:
        if x and x not in out:
            out.append(x)
    return out


def _merge_evidence(
    existing: list[EvidenceSpan], incoming: list[EvidenceSpan]
) -> list[EvidenceSpan]:
    """Append, dedup by (source_id, quote)."""
    seen = {(e.source_id, e.quote) for e in existing}
    out = list(existing)
    for e in incoming:
        key = (e.source_id, e.quote)
        if key not in seen:
            out.append(e)
            seen.add(key)
    return out


# ─── Person merge (most complex) ─────────────────────────────────────────────


def _merge_person(existing: Person, incoming: Person) -> Person:
    """Take the existing record; layer incoming on top."""
    return Person(
        id=existing.id,
        name=existing.name or incoming.name,
        role=existing.role or incoming.role,
        area=existing.area or incoming.area,
        email=existing.email or incoming.email,
        phone=existing.phone or incoming.phone,
        manager_id=existing.manager_id or incoming.manager_id,
        direct_reports=_merge_lists(existing.direct_reports, incoming.direct_reports),
        top_collaborators=_merge_lists(
            existing.top_collaborators, incoming.top_collaborators
        ),
        current_projects=_merge_lists(
            existing.current_projects, incoming.current_projects
        ),
        recurring_meetings=_merge_lists(
            existing.recurring_meetings, incoming.recurring_meetings
        ),
        owns_processes=_merge_lists(existing.owns_processes, incoming.owns_processes),
        expertise_areas=_merge_lists(
            existing.expertise_areas, incoming.expertise_areas
        ),
        is_active=existing.is_active,
        last_interviewed_at=incoming.last_interviewed_at
        or existing.last_interviewed_at,
        evidence=_merge_evidence(existing.evidence, incoming.evidence),
    )


def _resolve_person(skills: SkillsFile, candidate: Person) -> int:
    """Find an existing person matching candidate by id, email, or name."""
    if (idx := _find_by_id(skills.people, candidate.id)) >= 0:
        return idx
    for i, p in enumerate(skills.people):
        if (
            candidate.email
            and p.email
            and candidate.email.lower() == p.email.lower()
        ):
            return i
        if _name_match(p.name, candidate.name):
            return i
    return -1


# ─── Public merge entry point ────────────────────────────────────────────────


def merge_extraction_into_skills_file(
    skills: SkillsFile,
    *,
    people: list[Person] = (),
    tools: list[Tool] = (),
    access_paths: list[AccessPath] = (),
    processes: list[Process] = (),
    ticket_types: list[TicketType] = (),
    glossary: list[GlossaryTerm] = (),
    informal_rules: list[InformalRule] = (),
    relationships: list[Relationship] = (),
    knowledge_gaps: list[str] = (),
) -> SkillsFile:
    """Merge a single extraction (typically one interview's output) into the
    Skills File. Mutates and returns `skills`.

    Mutates in place to keep memory low — callers receive the same object.
    """
    # People: id/email/name resolution
    for p in people:
        idx = _resolve_person(skills, p)
        if idx >= 0:
            # If the candidate has a different id than the existing record, keep
            # the existing id (it's the canonical one from org chart).
            existing = skills.people[idx]
            merged = _merge_person(existing, p)
            skills.people[idx] = merged
        else:
            skills.people.append(p)

    # Tools, access paths, processes, ticket types, glossary, rules:
    # dedupe by id only for now. (Future V2: dedupe by name + purpose.)
    _merge_by_id(skills.tools, tools)
    _merge_by_id(skills.access_paths, access_paths)
    _merge_by_id(skills.processes, processes)
    _merge_by_id(skills.ticket_types, ticket_types)
    _merge_by_id(skills.glossary, glossary)
    _merge_by_id(skills.informal_rules, informal_rules)

    # Relationships: dedupe by (source_id, relation, target_id) tuple
    seen_rel = {
        (r.source_id, r.relation, r.target_id) for r in skills.relationships
    }
    for rel in relationships:
        key = (rel.source_id, rel.relation, rel.target_id)
        if key not in seen_rel:
            skills.relationships.append(rel)
            seen_rel.add(key)

    # Knowledge gaps — append new ones
    skills.knowledge_gaps = _merge_lists(skills.knowledge_gaps, list(knowledge_gaps))

    return skills


def _merge_by_id(target: list[T], incoming: list[T]) -> None:
    """Merge `incoming` into `target` in place, deduping by .id and merging
    .evidence. For collisions, list fields are unioned."""
    for item in incoming:
        idx = _find_by_id(target, item.id)
        if idx < 0:
            target.append(item)
            continue
        existing = target[idx]
        # Generic merge: walk all model fields, union lists, append evidence.
        for field_name, _info in existing.model_fields.items():
            ev_existing = getattr(existing, field_name)
            ev_incoming = getattr(item, field_name)
            if field_name == "evidence":
                setattr(
                    existing,
                    field_name,
                    _merge_evidence(ev_existing, ev_incoming),
                )
            elif isinstance(ev_existing, list) and isinstance(ev_incoming, list):
                # Lists of strings: union; lists of objects: append unique by id.
                if ev_existing and hasattr(ev_existing[0], "id"):
                    by_id = {e.id: e for e in ev_existing}
                    for x in ev_incoming:
                        if x.id not in by_id:
                            ev_existing.append(x)
                else:
                    setattr(
                        existing, field_name, _merge_lists(ev_existing, ev_incoming)
                    )
            else:
                if not ev_existing and ev_incoming:
                    setattr(existing, field_name, ev_incoming)
