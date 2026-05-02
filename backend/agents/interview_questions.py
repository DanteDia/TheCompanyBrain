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
        "text": "Para arrancar, contame en una frase tu rol y en qué área estás.",
        "extracts": ["Person.role", "Person.area"],
        "follow_up_if_unclear": True,
    },
    {
        "id": "q2_current_work",
        "text": "¿Cuáles son las 2 o 3 cosas más importantes en las que estás trabajando esta semana?",
        "extracts": ["Person.current_projects", "Process (mencionados)"],
    },
    {
        "id": "q3_recurring_meetings",
        "text": "¿En qué reuniones recurrentes participás? Pensá en daily, semanales, mensuales — qué son, con quiénes.",
        "extracts": ["Person.recurring_meetings", "Relationship.collaborates_with"],
    },
    {
        "id": "q4_top_collaborators",
        "text": "¿Quiénes son las 5 personas con las que más colaborás día a día? Decime nombres y para qué temas.",
        "extracts": [
            "Person.top_collaborators",
            "Relationship.collaborates_with",
            "Person.expertise_areas (de los otros)",
        ],
    },
    {
        "id": "q5_manager_reports",
        "text": "¿A quién le reportás? ¿Y tenés gente a cargo? Si sí, ¿quiénes son?",
        "extracts": ["Person.manager_id", "Person.direct_reports"],
    },
    {
        "id": "q6_tools_used",
        "text": "¿Qué sistemas o herramientas usás todos los días? Pensá en software, plataformas, lo que tengas abierto siempre.",
        "extracts": ["Tool", "Person uses Tool"],
    },
    {
        "id": "q7_access_paths",
        "text": (
            "Cuando entraste a la empresa, ¿a quién le pediste acceso a esos sistemas? "
            "Y si entrara alguien nuevo a tu equipo hoy, ¿a quién mandarías que le pida cada cosa?"
        ),
        "extracts": ["AccessPath", "Tool.access_path_id"],
        "why_this_matters": (
            "La pregunta más importante para el Trojan Horse — toda la respuesta de "
            "Q&A onboarding sale de acá."
        ),
    },
    {
        "id": "q8_tickets_received",
        "text": "¿Qué tipo de pedidos o consultas te llegan a vos? ¿De qué áreas o personas suelen venir?",
        "extracts": ["TicketType", "Person.expertise_areas"],
    },
    {
        "id": "q9_escalation",
        "text": "Cuando hay algo que no podés resolver vos, ¿a quién se lo escalás? ¿Y si tu manager no está, qué hacés?",
        "extracts": ["Relationship.escalates_to"],
    },
    {
        "id": "q10_process_ownership",
        "text": (
            "¿Hay algún proceso o flujo del que vos seas el dueño o el referente? "
            "Es decir, si alguien tiene una pregunta sobre eso, te la haría a vos."
        ),
        "extracts": ["Process.owner_id", "Person.owns_processes"],
    },
    {
        "id": "q11_informal_knowledge",
        "text": (
            "Esta es importante: ¿qué cosas aprendiste de cómo funciona la empresa "
            "que NO están escritas en ningún manual ni se lo dicen al que recién entra?"
        ),
        "extracts": ["InformalRule"],
        "why_this_matters": (
            "Acá vive el oro. Las reglas no escritas son lo que diferencia a "
            "Company Brain de Confluence."
        ),
    },
    {
        "id": "q12_glossary",
        "text": "¿Hay términos, nombres de productos o siglas que se usan acá adentro y que alguien de afuera no entendería?",
        "extracts": ["GlossaryTerm"],
    },
    {
        "id": "q13_open",
        "text": (
            "Última: ¿hay algo importante de cómo trabajás o de cómo funciona la "
            "empresa que no te pregunté y debería saber?"
        ),
        "extracts": ["*"],
    },
]


def questions_block_for_prompt() -> str:
    """Format the 13 questions as a numbered list for the system prompt."""
    return "\n".join(f"{q['id']}: {q['text']}" for q in INTERVIEW_QUESTIONS)
