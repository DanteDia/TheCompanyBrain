"""Load the BIND Jira Service Desk portal catalogue into Tool/AccessPath/TicketType.

Source: sample_data/jsd_portals.json — captured from
https://bindtm.atlassian.net/servicedesk/customer/portals via JSM REST API.

Each portal becomes:
  - 1 Tool with id `tool-jsd-<key>`
  - 1 AccessPath with id `ap-jsd-<key>` linking to the Tool, requested_to set
    to the portal's owner_area, requires=["JSM access"], sla observed-empirical.
  - N TicketTypes (one per request_type), id `tt-jsd-<key>-<slug>`. Each
    handled_by=[owner_area], typical_origin=[].

Why this matters: new hires never know which portal to use. Once seeded, the
QA agent can answer "¿dónde subo la solicitud de blanqueo de contraseña?"
with a citation pointing at the right Tool + URL.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from backend.models.schemas import (
    AccessPath,
    EvidenceSpan,
    SkillsFile,
    TicketType,
    Tool,
)


def _slug(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return s.strip("-")[:60]


def load_portals(json_path: Path) -> dict:
    return json.loads(json_path.read_text(encoding="utf-8"))


def build_evidence(portal: dict) -> EvidenceSpan:
    return EvidenceSpan(
        source_type="document",
        source_id=f"jsd-portal-{portal['id']}",
        speaker=None,
        timestamp_seconds=None,
        quote=f"Portal {portal['name']!r} en Jira Service Desk de BIND — "
        f"{portal.get('purpose', '')[:200]}",
    )


def merge_portals_into_skills_file(sf: SkillsFile, portals_data: dict) -> dict:
    """Idempotent: re-running replaces tools/access_paths/ticket_types with
    matching ids. Returns counts.

    Skips portals marked deprecated/test_only by default — keeps the answer
    quality high for new-hire questions.
    """
    portals = portals_data.get("portals", [])

    existing_tools = {t.id: t for t in sf.tools}
    existing_aps = {ap.id: ap for ap in sf.access_paths}
    existing_tts = {tt.id: tt for tt in sf.ticket_types}

    n_tools = n_aps = n_tts = 0

    for p in portals:
        if p.get("deprecated") or p.get("test_only"):
            continue

        key = p["key"]
        tool_id = f"tool-jsd-{key}"
        ap_id = f"ap-jsd-{key}"
        evidence = [build_evidence(p)]

        # AccessPath first (so we can point Tool at it)
        ap = AccessPath(
            id=ap_id,
            target_tool_id=tool_id,
            requested_to=p.get("owner_area", "Tecnología"),
            requires=["Acceso a Jira Service Desk de BIND (SSO)"],
            sla=None,
            evidence=evidence,
        )
        existing_aps[ap_id] = ap
        n_aps += 1

        tool = Tool(
            id=tool_id,
            name=f"JSM Portal: {p['name']}",
            purpose=(
                f"{p.get('purpose', '')}\n\n"
                f"URL: {p['url']}\n"
                f"Tipos de solicitud disponibles: "
                f"{', '.join(p.get('request_types', p.get('request_types_sample', [])))[:600]}"
            ),
            owners=[],
            used_by_areas=[p.get("owner_area", "Todas")],
            access_path_id=ap_id,
            evidence=evidence,
        )
        existing_tools[tool_id] = tool
        n_tools += 1

        # TicketTypes — one per request_type
        for rt in p.get("request_types", []) + p.get("request_types_sample", []):
            tt_id = f"tt-jsd-{key}-{_slug(rt)}"
            tt = TicketType(
                id=tt_id,
                name=rt,
                handled_by=[],
                typical_origin=[],
                evidence=evidence,
            )
            existing_tts[tt_id] = tt
            n_tts += 1

    sf.tools = list(existing_tools.values())
    sf.access_paths = list(existing_aps.values())
    sf.ticket_types = list(existing_tts.values())

    return {
        "tools_added_or_updated": n_tools,
        "access_paths_added_or_updated": n_aps,
        "ticket_types_added_or_updated": n_tts,
        "skipped_deprecated_or_test": sum(
            1 for p in portals if p.get("deprecated") or p.get("test_only")
        ),
    }
