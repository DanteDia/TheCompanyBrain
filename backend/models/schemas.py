"""Pydantic schemas for the Skills File — the knowledge graph of an organization.

The Skills File is the single source of truth for the Q&A agent. Every entity
carries `evidence` so the Q&A answer can cite exactly where each claim came from
(transcript timestamp, speaker, quote — or org chart row).

Hierarchy:
    SkillsFile
      ├── people: List[Person]
      ├── tools: List[Tool]
      ├── access_paths: List[AccessPath]
      ├── processes: List[Process]
      ├── ticket_types: List[TicketType]
      ├── glossary: List[GlossaryTerm]
      ├── informal_rules: List[InformalRule]
      └── relationships: List[Relationship]
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator

# ─── Provenance ──────────────────────────────────────────────────────────────


class EvidenceSpan(BaseModel):
    """Where a piece of information came from. Required on every entity claim."""

    source_type: Literal["interview", "document", "org_chart", "manual_edit"]
    source_id: str = Field(..., description="interview call_id, filename, or row id")
    speaker: Optional[str] = Field(None, description="speaker if this is an interview")
    timestamp_seconds: Optional[float] = Field(
        None, description="position in the audio if this is an interview"
    )
    quote: str = Field(
        ..., description="literal fragment, ≤30 words, never paraphrased"
    )

    @field_validator("quote")
    @classmethod
    def _quote_short(cls, v: str) -> str:
        if len(v.split()) > 40:
            # Soft limit — extractor sometimes overshoots, we trim rather than fail
            return " ".join(v.split()[:40]) + "..."
        return v


# ─── Entities ────────────────────────────────────────────────────────────────


class Person(BaseModel):
    """An employee. Skeleton seeded from org_chart.csv, enriched per interview."""

    id: str = Field(..., description='stable id, e.g. "ana_lopez"')
    name: str
    role: str
    area: str
    email: Optional[str] = None
    phone: Optional[str] = None
    manager_id: Optional[str] = None
    direct_reports: list[str] = Field(default_factory=list)

    top_collaborators: list[str] = Field(
        default_factory=list,
        description='ids — answer to "with whom do you collaborate most?"',
    )
    current_projects: list[str] = Field(
        default_factory=list, description="2-3 things the person is on this week"
    )
    recurring_meetings: list[str] = Field(default_factory=list)
    owns_processes: list[str] = Field(
        default_factory=list, description="ids of Process the person is the referent for"
    )
    expertise_areas: list[str] = Field(
        default_factory=list,
        description="what the person knows / what they get asked about",
    )

    is_active: bool = True
    last_interviewed_at: Optional[datetime] = None
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class Tool(BaseModel):
    """System / software / platform / repo used inside the company."""

    id: str
    name: str
    purpose: str
    owners: list[str] = Field(default_factory=list, description="ids of Person")
    used_by_areas: list[str] = Field(default_factory=list)
    access_path_id: Optional[str] = None
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class AccessPath(BaseModel):
    """How to obtain access to a Tool. The core of the Trojan Horse use case."""

    id: str
    target_tool_id: str
    requested_to: str = Field(..., description="id of Person or a role string")
    requires: list[str] = Field(
        default_factory=list,
        description='preconditions, e.g. ["manager approval", "JIRA ticket"]',
    )
    sla: Optional[str] = Field(
        None, description="declared/observed turnaround, e.g. '24-48hs'"
    )
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class Process(BaseModel):
    """A named operational process — has an owner and participants."""

    id: str
    name: str
    description: str
    owner_id: Optional[str] = None
    participants: list[str] = Field(default_factory=list)
    related_tools: list[str] = Field(default_factory=list)
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class TicketType(BaseModel):
    """A type of request/inquiry — useful for routing 'who handles X?' queries."""

    id: str
    name: str
    handled_by: list[str] = Field(default_factory=list, description="ids of Person")
    typical_origin: list[str] = Field(
        default_factory=list, description="ids of Person who usually file this"
    )
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class GlossaryTerm(BaseModel):
    """An internal term, product name, or acronym that an outsider wouldn't know."""

    id: str
    term: str
    definition: str
    related_terms: list[str] = Field(default_factory=list)
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class InformalRule(BaseModel):
    """Knowledge that is NOT written down anywhere — the moat of Company Brain.

    Q11 of the interview targets these directly. Examples:
      "The real Compras SLA is 5 days, not the published 2."
      "If you need IT after 6pm, ping Tomás on WhatsApp, not via JIRA."
    """

    id: str
    description: str
    context: str = Field(..., description="when does this rule apply?")
    learned_from: list[str] = Field(
        default_factory=list, description="ids of Person who mentioned it"
    )
    evidence: list[EvidenceSpan] = Field(default_factory=list)


class Relationship(BaseModel):
    """An edge in the graph. Source/target are ids of any entity type."""

    source_id: str
    source_type: Literal[
        "person", "tool", "process", "access_path", "ticket_type", "glossary", "rule"
    ]
    relation: Literal[
        "reports_to",
        "manages",
        "collaborates_with",
        "asks_for_access_to",
        "owns",
        "uses",
        "escalates_to",
        "handles",
        "originates",
        "related_to",
    ]
    target_id: str
    target_type: Literal[
        "person", "tool", "process", "access_path", "ticket_type", "glossary", "rule"
    ]
    strength: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="0-1 confidence; e.g. mention frequency"
    )
    evidence: Optional[EvidenceSpan] = None


# ─── Skills File ─────────────────────────────────────────────────────────────


class Coverage(BaseModel):
    """How much of the org has been interviewed so far."""

    interviewed: int = 0
    total_employees: int = 0

    @property
    def pct(self) -> float:
        return self.interviewed / self.total_employees if self.total_employees else 0.0


class SkillsFile(BaseModel):
    """The whole knowledge graph for one organization. Source of truth for Q&A."""

    organization_id: str
    organization_name: str
    generated_at: datetime
    version: str = "1.0.0"
    coverage: Coverage = Field(default_factory=Coverage)

    people: list[Person] = Field(default_factory=list)
    tools: list[Tool] = Field(default_factory=list)
    access_paths: list[AccessPath] = Field(default_factory=list)
    processes: list[Process] = Field(default_factory=list)
    ticket_types: list[TicketType] = Field(default_factory=list)
    glossary: list[GlossaryTerm] = Field(default_factory=list)
    informal_rules: list[InformalRule] = Field(default_factory=list)
    relationships: list[Relationship] = Field(default_factory=list)

    knowledge_gaps: list[str] = Field(
        default_factory=list,
        description="topics the agent couldn't answer; surface to admins",
    )

    # ── Convenience accessors ─────────────────────────────────────────────────

    def person(self, person_id: str) -> Optional[Person]:
        return next((p for p in self.people if p.id == person_id), None)

    def tool(self, tool_id: str) -> Optional[Tool]:
        return next((t for t in self.tools if t.id == tool_id), None)

    def access_path_for_tool(self, tool_id: str) -> Optional[AccessPath]:
        tool = self.tool(tool_id)
        if not tool or not tool.access_path_id:
            return None
        return next(
            (ap for ap in self.access_paths if ap.id == tool.access_path_id), None
        )

    def people_with_expertise(self, query: str) -> list[Person]:
        q = query.lower()
        return [
            p
            for p in self.people
            if p.is_active
            and any(q in area.lower() for area in p.expertise_areas)
        ]

    def to_router_summary(self) -> dict[str, Any]:
        """Compact representation for the Haiku router — names + ids only."""
        return {
            "people": [
                {
                    "id": p.id,
                    "name": p.name,
                    "role": p.role,
                    "area": p.area,
                    "expertise": p.expertise_areas,
                }
                for p in self.people
                if p.is_active
            ],
            "tools": [{"id": t.id, "name": t.name, "purpose": t.purpose} for t in self.tools],
            "processes": [{"id": pr.id, "name": pr.name} for pr in self.processes],
            "ticket_types": [{"id": tt.id, "name": tt.name} for tt in self.ticket_types],
            "glossary": [{"id": g.id, "term": g.term} for g in self.glossary],
            "informal_rules_count": len(self.informal_rules),
        }


# ─── Q&A response schema ─────────────────────────────────────────────────────


class Citation(BaseModel):
    entity_type: str
    entity_id: str
    quote: str
    speaker: Optional[str] = None
    source_type: str  # "interview" | "document" | "org_chart"
    source_id: str


class FollowUpSuggestion(BaseModel):
    text: str
    why: Optional[str] = None


class Answer(BaseModel):
    """Structured response from the Q&A agent. Always returned via tool use."""

    summary: str = Field(..., description="2-3 line direct answer")
    person_to_contact: Optional[Person] = None
    procedure: Optional[str] = None
    sla: Optional[str] = None

    insufficient_information: bool = False
    referenced_entity_ids: list[str] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    follow_ups: list[FollowUpSuggestion] = Field(default_factory=list)

    thinking_trace: Optional[str] = None  # extended thinking block, optional
