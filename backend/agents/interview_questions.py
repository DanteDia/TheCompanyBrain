"""The 13 questions the Interview Agent asks each employee.

Order matters — the first 10 are quick (15-30s each), 11 and 13 are open-ended
where the agent mines for informal_rules and miscellaneous knowledge.

Total budget: ~6-8 minutes per employee.
"""

from __future__ import annotations

from typing import TypedDict


class Question(TypedDict, total=False):
    id: str
    text: str
    extracts: list[str]
    follow_up_if_unclear: bool
    why_this_matters: str


INTERVIEW_QUESTIONS: list[Question] = [
    {
        "id": "q1_role",
        "text": "To start, tell me in one sentence your role and what area you're in.",
        "extracts": ["Person.role", "Person.area"],
        "follow_up_if_unclear": True,
    },
    {
        "id": "q2_current_work",
        "text": "What are the 2 or 3 most important things you're working on this week?",
        "extracts": ["Person.current_projects", "Process (mencionados)"],
    },
    {
        "id": "q3_recurring_meetings",
        "text": "What recurring meetings do you join? Think dailies, weeklies, monthlies — what they are and with whom.",
        "extracts": ["Person.recurring_meetings", "Relationship.collaborates_with"],
    },
    {
        "id": "q4_top_collaborators",
        "text": "Who are the 5 people you collaborate with most day-to-day? Tell me names and topics.",
        "extracts": [
            "Person.top_collaborators",
            "Relationship.collaborates_with",
            "Person.expertise_areas (de los otros)",
        ],
    },
    {
        "id": "q5_manager_reports",
        "text": "Who do you report to? And do you have direct reports? If so, who are they?",
        "extracts": ["Person.manager_id", "Person.direct_reports"],
    },
    {
        "id": "q6_tools_used",
        "text": "What systems or tools do you use every day? Think software, platforms, whatever you always have open.",
        "extracts": ["Tool", "Person uses Tool"],
    },
    {
        "id": "q7_access_paths",
        "text": (
            "When you joined the company, who did you ask for access to those systems? "
            "And if someone new joined your team today, who would you send them to for each one?"
        ),
        "extracts": ["AccessPath", "Tool.access_path_id"],
        "why_this_matters": (
            "La pregunta más importante para el Trojan Horse — toda la respuesta de "
            "Q&A onboarding sale de acá."
        ),
    },
    {
        "id": "q8_tickets_received",
        "text": "What kinds of requests or questions come to you? From what areas or people do they usually come?",
        "extracts": ["TicketType", "Person.expertise_areas"],
    },
    {
        "id": "q9_escalation",
        "text": "When there's something you can't solve yourself, who do you escalate to? And if your manager is out, what do you do?",
        "extracts": ["Relationship.escalates_to"],
    },
    {
        "id": "q10_process_ownership",
        "text": (
            "Is there a process or workflow that you own or are the go-to person for? "
            "Meaning, if someone has a question about it, they'd ask you."
        ),
        "extracts": ["Process.owner_id", "Person.owns_processes"],
    },
    {
        "id": "q11_informal_knowledge",
        "text": (
            "This one's important: what things have you learned about how the company works "
            "that are NOT written in any manual and that nobody tells the new hire?"
        ),
        "extracts": ["InformalRule"],
        "why_this_matters": (
            "Acá vive el oro. Las reglas no escritas son lo que diferencia a "
            "Company Brain de Confluence."
        ),
    },
    {
        "id": "q12_glossary",
        "text": "Are there terms, product names, or acronyms used here that someone from outside wouldn't understand?",
        "extracts": ["GlossaryTerm"],
    },
    {
        "id": "q13_open",
        "text": (
            "Last one: is there anything important about how you work or how the company "
            "operates that I didn't ask and should know?"
        ),
        "extracts": ["*"],
    },
]


def questions_block_for_prompt() -> str:
    """Format the 13 questions as a numbered list for the system prompt."""
    return "\n".join(f"{q['id']}: {q['text']}" for q in INTERVIEW_QUESTIONS)
