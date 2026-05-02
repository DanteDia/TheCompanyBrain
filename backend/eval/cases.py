"""The 8 eval cases — these gate every deploy.

Each case is checked against the answer from the Q&A agent. The check function
accepts the answer dict + the SkillsFile and returns (ok: bool, reason: str).
"""

from __future__ import annotations

from typing import Any, Callable

from backend.models.schemas import SkillsFile

# A check is (answer, skills_file) → (ok, reason)
Check = Callable[[dict[str, Any], SkillsFile], tuple[bool, str]]


def _has_name(answer: dict, name: str) -> bool:
    """Check if a name appears in summary, procedure, person, or citations."""
    name_lower = name.lower()
    blob = " ".join(
        str(answer.get(k, "")) for k in ("summary", "procedure", "sla")
    ).lower()
    if name_lower in blob:
        return True
    person = answer.get("person_to_contact")
    if person and name_lower in (person.get("name", "") + " " + person.get("role", "")).lower():
        return True
    for c in answer.get("citations", []):
        if name_lower in c.get("quote", "").lower():
            return True
    return False


def _has_any_name(answer: dict, names: list[str]) -> bool:
    return any(_has_name(answer, n) for n in names)


def _references_informal_rule(answer: dict, skills: SkillsFile) -> bool:
    """True if any cited entity_type is 'rule' or any informal_rule id is referenced."""
    rule_ids = {r.id for r in skills.informal_rules}
    if any(c.get("entity_type") in ("rule", "informal_rule") for c in answer.get("citations", [])):
        return True
    return any(eid in rule_ids for eid in answer.get("referenced_entity_ids", []))


def _check_mentions(names: list[str]) -> Check:
    def check(answer: dict, _: SkillsFile) -> tuple[bool, str]:
        missing = [n for n in names if not _has_name(answer, n)]
        return (not missing, f"missing names: {missing}" if missing else "ok")

    return check


def _check_must_not_mention(forbidden: list[str]) -> Check:
    def check(answer: dict, _: SkillsFile) -> tuple[bool, str]:
        present = [n for n in forbidden if _has_name(answer, n)]
        return (not present, f"forbidden present: {present}" if present else "ok")

    return check


def _check_insufficient_and_mention(must_mention: list[str]) -> Check:
    def check(answer: dict, _: SkillsFile) -> tuple[bool, str]:
        if not answer.get("insufficient_information"):
            return False, "expected insufficient_information=True"
        missing = [n for n in must_mention if not _has_name(answer, n)]
        return (not missing, f"missing redirect: {missing}" if missing else "ok")

    return check


def _check_min_entities_referenced(n: int) -> Check:
    def check(answer: dict, _: SkillsFile) -> tuple[bool, str]:
        ref = answer.get("referenced_entity_ids", []) or []
        return (
            len(ref) >= n,
            "ok" if len(ref) >= n else f"only {len(ref)} entities referenced, need ≥{n}",
        )

    return check


def _check_has_citation_from_interview() -> Check:
    def check(answer: dict, _: SkillsFile) -> tuple[bool, str]:
        for c in answer.get("citations", []):
            if c.get("source_type") == "interview":
                return True, "ok"
        return False, "no citation with source_type=interview"

    return check


def _all(*checks: Check) -> Check:
    def check(answer: dict, sf: SkillsFile) -> tuple[bool, str]:
        for c in checks:
            ok, reason = c(answer, sf)
            if not ok:
                return False, reason
        return True, "ok"

    return check


# ─── The 8 cases ─────────────────────────────────────────────────────────────


EVAL_CASES: list[dict[str, Any]] = [
    {
        "name": "access_path_salesforce",
        "query": "Necesito acceso a Salesforce, ¿a quién le pido?",
        "check": _all(
            _check_mentions(["Ana"]),
            _check_has_citation_from_interview(),
        ),
    },
    {
        "name": "access_path_multiple_systems",
        "query": "Soy nuevo en Operaciones. Necesito Salesforce y SharePoint, ¿a quién pido cada uno?",
        "check": _all(
            _check_mentions(["Ana", "Tomas"]),
            _check_min_entities_referenced(2),
        ),
    },
    {
        "name": "person_lookup_complaints",
        "query": "¿Quién maneja los reclamos de clientes mayoristas?",
        "check": _check_mentions(["Roberto"]),
    },
    {
        "name": "informal_rule_real_sla",
        "query": "¿Cuánto tarda realmente un alta de usuario en sistemas?",
        "check": lambda a, sf: (
            (_references_informal_rule(a, sf), "did not reference an informal rule")
        ),
    },
    {
        "name": "knowledge_gap_paternity",
        "query": "¿Cuál es la política de licencias por paternidad?",
        "check": _check_insufficient_and_mention(["Valeria"]),
    },
    {
        "name": "ownership_credit_processes",
        "query": "¿Quién es el dueño del proceso de evaluación crediticia?",
        "check": _check_mentions(["Ana"]),
    },
    {
        "name": "expertise_routing_aws",
        "query": "¿A quién le puedo preguntar sobre infraestructura de AWS?",
        "check": _check_mentions(["Tomas"]),
    },
    {
        "name": "no_hallucination_vp_marketing",
        "query": "¿Quién es el VP de Marketing?",
        "check": _all(
            _check_must_not_mention(["VP de Marketing", "VP Marketing"]),
            lambda a, _: (
                bool(a.get("insufficient_information")),
                "expected insufficient_information=True (no VP Marketing exists)",
            ),
        ),
    },
]
