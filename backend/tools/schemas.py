"""Anthropic tool schemas — used by all agents that produce structured output.

Each agent gets handed the relevant tool(s) and is forced (via tool_choice) to
produce output that matches the schema. We never accept free-text JSON.

Tools:
    EXTRACT_FROM_INTERVIEW_TOOL — post_interview agent (Opus + extended thinking)
    ROUTE_ENTITIES_TOOL         — router agent (Haiku)
    SUBMIT_ANSWER_TOOL          — Q&A agent (Opus + extended thinking)
    ORGANIZE_SKILLS_FILE_TOOL   — admin cleanup pass (rarely used, optional)
"""

from __future__ import annotations

from typing import Any

# ─── Reusable sub-schemas ────────────────────────────────────────────────────

_EVIDENCE_SPAN = {
    "type": "object",
    "properties": {
        "source_type": {
            "type": "string",
            "enum": ["interview", "document", "org_chart", "manual_edit"],
        },
        "source_id": {"type": "string"},
        "speaker": {"type": "string"},
        "timestamp_seconds": {"type": "number"},
        "quote": {
            "type": "string",
            "description": "Literal fragment from the source. ≤30 words. NEVER paraphrase.",
        },
    },
    "required": ["source_type", "source_id", "quote"],
}

_PERSON_EXTRACTION = {
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "description": 'snake_case stable id, e.g. "ana_lopez"',
        },
        "name": {"type": "string"},
        "role": {"type": "string"},
        "area": {"type": "string"},
        "email": {"type": "string"},
        "phone": {"type": "string"},
        "manager_id": {"type": "string"},
        "direct_reports": {"type": "array", "items": {"type": "string"}},
        "top_collaborators": {"type": "array", "items": {"type": "string"}},
        "current_projects": {"type": "array", "items": {"type": "string"}},
        "recurring_meetings": {"type": "array", "items": {"type": "string"}},
        "owns_processes": {"type": "array", "items": {"type": "string"}},
        "expertise_areas": {"type": "array", "items": {"type": "string"}},
        "evidence": {"type": "array", "items": _EVIDENCE_SPAN},
    },
    "required": ["id", "name", "evidence"],
}

_TOOL_EXTRACTION = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"},
        "purpose": {"type": "string"},
        "owners": {"type": "array", "items": {"type": "string"}},
        "used_by_areas": {"type": "array", "items": {"type": "string"}},
        "access_path_id": {"type": "string"},
        "evidence": {"type": "array", "items": _EVIDENCE_SPAN},
    },
    "required": ["id", "name", "evidence"],
}

_ACCESS_PATH_EXTRACTION = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "target_tool_id": {"type": "string"},
        "requested_to": {
            "type": "string",
            "description": "id of Person OR a role string if person isn't known",
        },
        "requires": {"type": "array", "items": {"type": "string"}},
        "sla": {"type": "string"},
        "evidence": {"type": "array", "items": _EVIDENCE_SPAN},
    },
    "required": ["id", "target_tool_id", "requested_to", "evidence"],
}

_PROCESS_EXTRACTION = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"},
        "description": {"type": "string"},
        "owner_id": {"type": "string"},
        "participants": {"type": "array", "items": {"type": "string"}},
        "related_tools": {"type": "array", "items": {"type": "string"}},
        "evidence": {"type": "array", "items": _EVIDENCE_SPAN},
    },
    "required": ["id", "name", "evidence"],
}

_TICKET_TYPE_EXTRACTION = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"},
        "handled_by": {"type": "array", "items": {"type": "string"}},
        "typical_origin": {"type": "array", "items": {"type": "string"}},
        "evidence": {"type": "array", "items": _EVIDENCE_SPAN},
    },
    "required": ["id", "name", "evidence"],
}

_GLOSSARY_EXTRACTION = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "term": {"type": "string"},
        "definition": {"type": "string"},
        "related_terms": {"type": "array", "items": {"type": "string"}},
        "evidence": {"type": "array", "items": _EVIDENCE_SPAN},
    },
    "required": ["id", "term", "definition", "evidence"],
}

_INFORMAL_RULE_EXTRACTION = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "description": {
            "type": "string",
            "description": "The unwritten rule, paraphrased neutrally.",
        },
        "context": {"type": "string"},
        "learned_from": {"type": "array", "items": {"type": "string"}},
        "evidence": {"type": "array", "items": _EVIDENCE_SPAN},
    },
    "required": ["id", "description", "context", "evidence"],
}

_RELATIONSHIP_EXTRACTION = {
    "type": "object",
    "properties": {
        "source_id": {"type": "string"},
        "source_type": {
            "type": "string",
            "enum": [
                "person",
                "tool",
                "process",
                "access_path",
                "ticket_type",
                "glossary",
                "rule",
            ],
        },
        "relation": {
            "type": "string",
            "enum": [
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
            ],
        },
        "target_id": {"type": "string"},
        "target_type": {
            "type": "string",
            "enum": [
                "person",
                "tool",
                "process",
                "access_path",
                "ticket_type",
                "glossary",
                "rule",
            ],
        },
        "strength": {"type": "number", "minimum": 0, "maximum": 1},
        "evidence": _EVIDENCE_SPAN,
    },
    "required": ["source_id", "source_type", "relation", "target_id", "target_type"],
}


# ─── Tool 1: extract from interview transcript ───────────────────────────────

EXTRACT_FROM_INTERVIEW_TOOL: dict[str, Any] = {
    "name": "extract_from_interview",
    "description": (
        "Extract all structured knowledge from an interview transcript. Capture "
        "every Person, Tool, AccessPath, Process, TicketType, GlossaryTerm, "
        "InformalRule, and Relationship that the employee mentioned. Each entity "
        "MUST include an evidence array with literal quote(s) ≤30 words. Do NOT "
        "invent information. Be GENEROUS with informal_rules — false positives are "
        "much better than missing them."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "people": {"type": "array", "items": _PERSON_EXTRACTION},
            "tools": {"type": "array", "items": _TOOL_EXTRACTION},
            "access_paths": {"type": "array", "items": _ACCESS_PATH_EXTRACTION},
            "processes": {"type": "array", "items": _PROCESS_EXTRACTION},
            "ticket_types": {"type": "array", "items": _TICKET_TYPE_EXTRACTION},
            "glossary": {"type": "array", "items": _GLOSSARY_EXTRACTION},
            "informal_rules": {
                "type": "array",
                "items": _INFORMAL_RULE_EXTRACTION,
            },
            "relationships": {"type": "array", "items": _RELATIONSHIP_EXTRACTION},
            "knowledge_gaps": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Topics the employee mentioned but didn't elaborate on.",
            },
        },
        "required": [
            "people",
            "tools",
            "access_paths",
            "processes",
            "ticket_types",
            "glossary",
            "informal_rules",
            "relationships",
            "knowledge_gaps",
        ],
    },
}


# ─── Tool 2: router (Haiku) ──────────────────────────────────────────────────

ROUTE_ENTITIES_TOOL: dict[str, Any] = {
    "name": "route_entities",
    "description": (
        "Given an employee's natural-language query and a compact summary of the "
        "Skills File (people, tools, processes, glossary, etc.), select the entity "
        "ids that are likely relevant to answering the query. Be inclusive — the "
        "Q&A agent prefers extra context to missing context. Cap at 30 ids total."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "people_ids": {"type": "array", "items": {"type": "string"}},
            "tool_ids": {"type": "array", "items": {"type": "string"}},
            "access_path_ids": {"type": "array", "items": {"type": "string"}},
            "process_ids": {"type": "array", "items": {"type": "string"}},
            "ticket_type_ids": {"type": "array", "items": {"type": "string"}},
            "glossary_ids": {"type": "array", "items": {"type": "string"}},
            "include_all_informal_rules": {
                "type": "boolean",
                "description": (
                    "If the query is operational, set to true so the Q&A agent "
                    "sees informal rules that might apply."
                ),
            },
            "reasoning": {
                "type": "string",
                "description": "1-2 sentences on why these were selected.",
            },
        },
        "required": [
            "people_ids",
            "tool_ids",
            "access_path_ids",
            "process_ids",
            "ticket_type_ids",
            "glossary_ids",
            "include_all_informal_rules",
            "reasoning",
        ],
    },
}


# ─── Tool 3: Q&A submit_answer ───────────────────────────────────────────────

_CITATION = {
    "type": "object",
    "properties": {
        "entity_type": {"type": "string"},
        "entity_id": {"type": "string"},
        "quote": {"type": "string"},
        "speaker": {"type": "string"},
        "source_type": {"type": "string"},
        "source_id": {"type": "string"},
    },
    "required": ["entity_type", "entity_id", "quote", "source_type", "source_id"],
}

_FOLLOW_UP = {
    "type": "object",
    "properties": {
        "text": {"type": "string"},
        "why": {"type": "string"},
    },
    "required": ["text"],
}

SUBMIT_ANSWER_TOOL: dict[str, Any] = {
    "name": "submit_answer",
    "description": (
        "Submit the structured answer to the employee's query. ALWAYS include "
        "citations for any factual claim. If you don't have the answer, set "
        "insufficient_information=true and use `summary` to redirect the user to "
        "the most likely person to ask (based on expertise_areas)."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "2-3 line direct answer. Plain language.",
            },
            "person_to_contact_id": {
                "type": "string",
                "description": "id of Person from the Skills File, if applicable.",
            },
            "procedure": {
                "type": "string",
                "description": (
                    "How the employee should request this — channel, format, "
                    "what to include. Skip if the answer is just a person lookup."
                ),
            },
            "sla": {"type": "string"},
            "insufficient_information": {"type": "boolean"},
            "referenced_entity_ids": {
                "type": "array",
                "items": {"type": "string"},
            },
            "citations": {"type": "array", "items": _CITATION},
            "follow_ups": {
                "type": "array",
                "items": _FOLLOW_UP,
                "description": "2-3 useful next questions the employee might ask.",
            },
            "proposed_ticket": {
                "type": "object",
                "description": (
                    "If the question requires action (not just info), propose a "
                    "ticket to be created in the company's Jira Service Desk. "
                    "User will see a 'Crear ticket' button to confirm. Skip for "
                    "purely informational queries."
                ),
                "properties": {
                    "service_desk_id": {
                        "type": "string",
                        "description": "Currently always '2' for the BLUR project.",
                    },
                    "request_type_id": {
                        "type": "string",
                        "description": (
                            "Numeric id from the catalog provided in the system "
                            "prompt. Default to '10' (Get IT help) for generic "
                            "issues. Use '17' for bugs, '24' for onboarding, '11' "
                            "for VPN, '14' for software requests."
                        ),
                    },
                    "summary": {
                        "type": "string",
                        "description": (
                            "Short, action-oriented, specific (≤120 chars). "
                            "Bad: 'Need help'. Good: 'Excel download from "
                            "Bloomberg Terminal failing on credit ops'."
                        ),
                    },
                    "description": {
                        "type": "string",
                        "description": (
                            "Detailed context: what the user said + any "
                            "relevant brain knowledge that gives context (who "
                            "owns it, related rules, etc.). Include a line "
                            "'Reportado vía Company Brain' at the end."
                        ),
                    },
                    "reasoning": {
                        "type": "string",
                        "description": (
                            "1 sentence on why this request type was chosen. "
                            "Used for telemetry, not shown to user."
                        ),
                    },
                },
                "required": [
                    "service_desk_id",
                    "request_type_id",
                    "summary",
                    "description",
                    "reasoning",
                ],
            },
        },
        "required": [
            "summary",
            "insufficient_information",
            "referenced_entity_ids",
            "citations",
            "follow_ups",
        ],
    },
}


# ─── Tool 4: organize / cleanup pass (admin tool, optional) ──────────────────

ORGANIZE_SKILLS_FILE_TOOL: dict[str, Any] = {
    "name": "organize_skills_file",
    "description": (
        "Given the current Skills File, propose merges (duplicate Person "
        "entries that are the same human), splits (one entry that should be "
        "two), and edits (clearer descriptions, fixed typos). Used in the "
        "admin /brain explorer pass — never auto-applied without a human."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "merges": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "entity_type": {"type": "string"},
                        "ids": {"type": "array", "items": {"type": "string"}},
                        "winning_id": {"type": "string"},
                        "reasoning": {"type": "string"},
                    },
                    "required": ["entity_type", "ids", "winning_id"],
                },
            },
            "renames": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "entity_type": {"type": "string"},
                        "id": {"type": "string"},
                        "new_name": {"type": "string"},
                        "reasoning": {"type": "string"},
                    },
                    "required": ["entity_type", "id", "new_name"],
                },
            },
            "edits": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "entity_type": {"type": "string"},
                        "id": {"type": "string"},
                        "field": {"type": "string"},
                        "new_value": {"type": "string"},
                        "reasoning": {"type": "string"},
                    },
                    "required": ["entity_type", "id", "field", "new_value"],
                },
            },
        },
        "required": ["merges", "renames", "edits"],
    },
}
