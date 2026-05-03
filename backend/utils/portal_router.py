"""Backend portal-intent classifier — mirrors frontend/lib/portal-router.ts.

Why this exists in two places: the frontend version short-circuits the web
/ask page so onboarding questions render instantly. The backend version
handles every other channel (Slack, WhatsApp, Google Chat, /api/ask from
non-frontend callers) — those hit the FastAPI server directly and would
otherwise wait on the QA agent for a question that has a deterministic
answer.

If both routers ever drift, the frontend is the source of truth — the
keyword list is curated there. Any change to portals-data.ts should be
mirrored here.
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


# ── Portal keyword catalogue (mirrors frontend/lib/portals-data.ts) ──────────

PORTALS_LANDING = "https://bindtm.atlassian.net/servicedesk/customer/portals"


@dataclass
class Portal:
    id: str
    name: str
    url: str
    owner: str
    keywords: list[str]
    request_types: list[str]


BIND_PORTALS: list[Portal] = [
    Portal(
        id="6",
        name="Servicios IT (Mesa de Ayuda)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/6",
        owner="Mesa de Ayuda — Tecnología",
        keywords=[
            "blanqueo", "blanquear", "blanqueo de contraseña", "blanqueo de password",
            "reset password", "resetear password", "password", "contraseña", "clave", "olvide",
            "mouse", "teclado", "monitor", "hardware", "impresora",
            "instalar software", "instalacion software", "instalacion de software",
            "vpn", "configurar vpn",
            "mudanza", "migracion equipo", "microinformatica",
            "mesa de ayuda", "soporte it", "soporte tecnico",
            "problema con sistema", "problema con el sistema", "problema con un sistema",
            "no funciona", "se rompio", "se traba", "no anda",
            "cash dispenser", "bcollect", "soporte banca",
            "ticket it", "ticket de it", "pedido it", "solicitud it",
        ],
        request_types=[
            "Colaboradores: Solicitud de servicio IT",
            "Colaboradores: Problema con un sistema, servicio o microinformatica",
            "Clientes: Cash Dispenser",
            "Clientes: Solicitudes para Bcollect",
            "Clientes: Soporte Banca",
            "Call Centers: Soporte a incidentes/solicitudes de clientes",
            "Proveedores: Solicitud de Soporte IT",
        ],
    ),
    Portal(
        id="72",
        name="Seguridad de la Información (SegInfo)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/72",
        owner="Seguridad de la Información",
        keywords=[
            "alta de usuario", "alta de colaborador", "alta colaborador", "alta de empleado",
            "baja de usuario", "baja de colaborador", "baja colaborador", "baja de empleado",
            "alta usuario externo", "alta de usuario externo",
            "alta consultora", "baja consultora",
            "permisos", "perfil de usuario", "abm de perfiles", "abm perfiles",
            "cambio de puesto", "cambio de rol",
            "consultora", "externo", "tercero",
            "acceso a sistema", "acceso a aplicacion", "permiso para",
            "seginfo", "seguridad informacion", "seguridad de la informacion",
            "darle acceso", "dar acceso", "doy acceso", "le doy acceso",
            "dar de alta", "darle de alta", "nuevo empleado", "empleado nuevo",
        ],
        request_types=[
            "Alta Colaborador/a BIND",
            "Alta Colaborador/a Externo/a Consultora",
            "Alta Colaborador/a Externo/a Directo",
            "Baja Colaborador/a BIND",
            "Baja Colaborador/a Externo/a Consultora",
            "Baja Colaborador/a Externo/a Directo",
            "Cambio de Puesto Definitivo de Colaboradores/as",
            "Requerimiento ABM de Perfiles",
        ],
    ),
    Portal(
        id="64",
        name="Capital Humano",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/64",
        owner="Capital Humano (RRHH)",
        keywords=[
            "busqueda de colaborador", "buscar colaborador", "nuevo colaborador",
            "incorporacion", "hiring", "contratar",
            "nueva posicion", "abrir busqueda",
            "rrhh", "recursos humanos", "capital humano",
        ],
        request_types=[
            "Búsqueda de nuevo colaborador",
            "Solicitud de incorporación de nuevos colaboradores",
        ],
    ),
    Portal(
        id="53",
        name="Préstamos y Adelantos BIND (RRHH)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/53",
        owner="Capital Humano",
        keywords=[
            "anticipo de sueldo", "adelanto de sueldo", "prestamo personal",
            "aumento limite tarjeta", "aumento limite tc",
            "cambio de domicilio", "cambio domicilio",
            "cobertura de puesto", "rotacion",
        ],
        request_types=[
            "Solicitud de Anticipo de Sueldo",
            "Solicitud de Préstamo Personal",
            "Solicitud de Aumento de Límite de TC",
            "Formulario de cambio de domicilio",
            "Cobertura de Puesto",
            "Rotación",
        ],
    ),
    Portal(
        id="37",
        name="Demandas Centralizadas",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/37",
        owner="Operaciones",
        keywords=[
            "demanda centralizada", "demandas centralizadas", "centralizada",
            "alta bind24", "baja bind24", "alta cuenta comitente", "cuenta comitente",
            "alta jubilo", "baja jubilo",
            "actualizacion de cliente", "apoderados",
            "anulacion atm", "anulacion homebanking",
            "aumento limite extraccion", "bloqueo telefonico",
            "certificacion de saldos", "cobranzas prestamo",
            "comex consulta", "consulta snp",
            "fallecidos", "asociar cuenta beneficio", "beneficio discapacidad",
        ],
        request_types=[
            "(50 tipos — operatoria diaria del banco)",
            "Adelantos / Adelanto Sucursal",
            "Alta Bind24 (empresas/zafiro)",
            "Alta cuenta comitente / GALLO-FPA / Júbilo",
            "Aumento de límite de extracción",
            "Certificación de Saldos",
            "Bloqueo telefónico",
            "COMEX - Consultas",
            "Beneficio Discapacidad",
            "Fallecidos (regularización)",
        ],
    ),
    Portal(
        id="33",
        name="OPR-TC (Operaciones de Productos)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/33",
        owner="Operaciones",
        keywords=[
            "abm cuentas comitentes", "abm empleados bind",
            "tarjetas virtuales", "tarjeta virtual", "b24",
            "datanet", "alta cuenta relacionada", "alta cuenta vinculada",
            "swift", "mt940",
            "mep devolucion", "transferencia inmediata",
            "balanceo atm", "tdv",
            "tarjeta regalo", "anticipo de cupones",
            "gdh alta", "gdh aumento limite", "gdh baja",
            "garantias consultas",
        ],
        request_types=[
            "Clientes.ABM de Cuentas Comitentes / Empleados BIND / Tarjetas Virtuales y B24",
            "Datanet.Alta Servicio / Cuenta Vinculada / Devoluciones",
            "MEP.Devolución / Devolución Transferencia Inmediata / Nro de MEP",
            "Swift.ALTA MT940",
            "TC.ABM línea anticipo de cupones / Aplicación de Pago",
            "TD.Balanceo ATM / TDV - ABM",
            "TR.Pedido Tarjeta Regalo",
            "GDH - Alta / Aumento de límite / Baja por desvinculación",
        ],
    ),
    Portal(
        id="70",
        name="Bind PSP (Pagos)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/70",
        owner="Bind Pagos",
        keywords=[
            "bind psp", "bind pagos", "alta de cliente psp", "baja de cliente psp",
            "pos", "dispositivo pos", "alta pos", "baja pos",
            "qri", "solicitud qri", "integracion pagos",
        ],
        request_types=[
            "Alta de Cliente / Baja de Cliente",
            "Alta de Dispositivo POS / Baja de Dispositivo POS",
            "Solicitud de QRI",
            "Integraciones",
            "Consultas y Reclamos",
        ],
    ),
    Portal(
        id="86",
        name="Portal Seguros BIND",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/86",
        owner="Bind Seguros",
        keywords=[
            "seguros", "poliza", "polizas", "asegurados",
            "modificacion de cobertura", "modificacion asegurado",
            "cobro cuotas seguros", "devolucion seguro",
            "reclamo seguros", "siniestro",
        ],
        request_types=[
            "Cobro Cuotas Manual",
            "Copias de Pólizas/Certificados",
            "Devoluciones",
            "Modificación de Asegurados",
            "Modificación de Cobertura",
            "Reclamo",
            "Legales",
        ],
    ),
    Portal(
        id="124",
        name="Portal Compliance (PLD)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/124",
        owner="Compliance / PLD",
        keywords=[
            "compliance", "cumplimiento", "consulta normativa",
            "consulta cumplimiento", "pld", "lavado de activos",
        ],
        request_types=["Consulta a Cumplimiento", "Consulta Normativa"],
    ),
    Portal(
        id="39",
        name="KYC-USD",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/39",
        owner="Compliance",
        keywords=[
            "kyc usd", "kyc dolares", "desbloqueo cuenta usd",
            "desbloqueo cuenta dolares", "cuenta en dolares bloqueada",
            "documentacion patrimonial",
        ],
        request_types=["KYC-USD"],
    ),
    Portal(
        id="87",
        name="Control Aperturas de Cuenta",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/87",
        owner="Compliance",
        keywords=[
            "apertura de cuenta", "aperturas de cuenta", "control apertura",
            "abrir cuenta", "abrir una cuenta", "abrir cuenta empresa",
            "onboarding cliente",
        ],
        request_types=["FORM Control Apertura de Cuenta"],
    ),
    Portal(
        id="51",
        name="Gestión de Fraudes",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/51",
        owner="Riesgos / Fraude",
        keywords=[
            "fraude", "fraudes", "reportar fraude", "potencial fraude",
            "estafa", "phishing", "investigacion fraude",
        ],
        request_types=["Formulario de Gestión de Fraude"],
    ),
    Portal(
        id="31",
        name="BI - Datos: Gestión de la demanda",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/31",
        owner="BI / Datos",
        keywords=[
            "tablero", "dashboard", "powerbi", "qlik",
            "pedido de informacion", "data", "datos",
            "problema de datos", "soporte tablero", "pedido bi",
        ],
        request_types=[
            "Nuevo pedido de Información",
            "Pedido de capacitación o soporte de uso",
            "Problema de datos o de tablero",
            "Solicitud por pruebas de usuario",
        ],
    ),
    Portal(
        id="20",
        name="Gestión Documental (GD/GeDe)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/20",
        owner="Procesos / GeDe",
        keywords=[
            "gestion documental", "gede", "gd",
            "cambio de parametria", "parametria",
            "actualizacion aplicativo", "regulatorio",
            "normativo", "comunicacion regulatoria",
        ],
        request_types=[
            "BAU - Cambio de Parametría",
            "GD - Actualización aplicativo",
            "GD - Normativo / Observación / Requerimiento General",
            "GeDe Regulatorio - Comunicación",
            "Nuevo pedido GeDe",
        ],
    ),
    Portal(
        id="23",
        name="Administración",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/23",
        owner="Administración",
        keywords=[
            "modificacion transaccion", "modificar transaccion",
            "transaccion emergencia", "solicitud transaccion",
            "impacto cuenta cliente",
        ],
        request_types=[
            "Modificación de Transacciones",
            "Solicitud de Transacción",
            "Solicitud de transacción SIN impacto en Cuenta Cliente",
            "Transacción de Emergencia",
        ],
    ),
    Portal(
        id="32",
        name="Portal Marketing",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/32",
        owner="Marketing / Sucursales",
        keywords=[
            "marketing", "auditoria mensual sucursal",
            "imagen sucursal", "cajero nuevo", "nuevo cajero",
            "mudanza sucursal", "refaccion sucursal", "pedido marketing",
        ],
        request_types=[
            "AUDITORÍA MENSUAL - SUCURSAL CON/SIN REQUERIMIENTOS",
            "IMAGEN SUCURSAL: NUEVOS CAJEROS / NUEVOS CASH",
            "IMAGEN SUCURSAL: MUDANZA / REFACCIÓN / URGENTES",
            "Solicitud MKT - Sucursal",
        ],
    ),
    Portal(
        id="29",
        name="IDCheques",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/29",
        owner="Operaciones",
        keywords=["id cheque", "id de cheque", "idcheques", "id cheques"],
        request_types=["Solicitud ID Cheque"],
    ),
    Portal(
        id="25",
        name="Solicitud de Viajes y Alojamiento",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/25",
        owner="Administración",
        keywords=[
            "viaje", "viajes", "alojamiento", "hotel",
            "viatico", "solicitud de viaje", "pasaje",
        ],
        request_types=["Solicitud de Viajes y Alojamiento"],
    ),
    Portal(
        id="81",
        name="Gestión de Contratos BIND",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/81",
        owner="Legales / Contratos",
        keywords=["contrato", "nuevo contrato", "alta contrato", "gestion de contratos"],
        request_types=["FORM de Nuevo Contrato"],
    ),
    Portal(
        id="34",
        name="Remuneración de Cuentas",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/34",
        owner="Operaciones",
        keywords=["remuneracion cuenta", "remuneracion de cuentas", "tasa cuenta"],
        request_types=["Solicitud de Remuneración de Cuentas"],
    ),
    Portal(
        id="11",
        name="Soporte y Gestión Previsional",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/11",
        owner="Operaciones / Previsional",
        keywords=[
            "previsional", "previsionales", "jubilacion",
            "modulo previsional", "soporte previsional",
        ],
        request_types=["Consulta", "Problema Operativo"],
    ),
]

# Question-shape detectors — at least one must hit for the router to fire.
INTENT_PATTERNS = [
    re.compile(r"\bportal\b"),
    re.compile(r"\bdonde\s+(subo|cargo|reporto|gestiono|hago|pido|solicito)\b"),
    re.compile(r"\ba\s+donde\s+(subo|cargo|reporto|pido|solicito)\b"),
    re.compile(r"\bcomo\s+(pido|solicito|cargo|gestiono|reporto|hago)\b"),
    re.compile(r"\bque\s+(portal|formulario|ticket)\b"),
    re.compile(r"\bjira\b"),
    re.compile(r"\bservicedesk\b"),
    re.compile(r"\bservice\s*desk\b"),
    re.compile(r"\bmesa\s+de\s+ayuda\b"),
    re.compile(r"\bblanqueo\b"),
    re.compile(r"\bblanquear\b"),
    re.compile(r"\balta\s+(de\s+)?(un\s+|una\s+|el\s+|la\s+|los\s+|las\s+)?(usuario|colaborador|empleado)\b"),
    re.compile(r"\bbaja\s+(de\s+)?(un\s+|una\s+|el\s+|la\s+|los\s+|las\s+)?(usuario|colaborador|empleado)\b"),
    re.compile(r"\babrir\s+(un\s+)?ticket\b"),
]


def _normalize(s: str) -> str:
    """lowercase + strip diacritics + collapse punctuation."""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[¿?¡!.,;:()\"]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _looks_like_portal_question(q: str) -> bool:
    n = _normalize(q)
    return any(p.search(n) for p in INTENT_PATTERNS)


def _score_portal(question_norm: str, p: Portal) -> int:
    score = 0
    for k in p.keywords:
        nk = _normalize(k)
        if not nk:
            continue
        if nk in question_norm:
            score += len(nk.split()) * 2
    if _normalize(p.name) in question_norm:
        score += 5
    return score


def _rank(question: str) -> list[tuple[Portal, int]]:
    n = _normalize(question)
    ranked = [(p, _score_portal(n, p)) for p in BIND_PORTALS]
    ranked = [x for x in ranked if x[1] > 0]
    ranked.sort(key=lambda x: -x[1])
    return ranked


def match_portal_intent(question: str) -> Optional[dict[str, Any]]:
    """Returns an Answer-shaped dict if the question is portal-routing-shaped,
    or None if it should fall through to the QA agent.

    Two ways to fire:
      1. Question matches an INTENT_PATTERN ("donde subo", "que portal", etc).
      2. A multi-word portal keyword scores >= 4 (e.g. "anticipo de sueldo",
         "cash dispenser", "tarjeta regalo"). This catches the common case
         where the user just states their need ("quiero solicitar un anticipo
         de sueldo") without asking "where".

    The shape matches what `qa_agent.answer_query` returns so callers can
    drop it in without conversion.
    """
    if not question or len(question) < 4:
        return None

    matches = _rank(question)
    intent_match = _looks_like_portal_question(question)
    strong_keyword = bool(matches) and matches[0][1] >= 4

    if not (intent_match or strong_keyword):
        return None
    if not matches:
        # Asked about portals but couldn't pin one — fall back to landing
        return {
            "summary": (
                "No te puedo precisar el portal exacto sin más contexto, pero "
                "todos los portales del banco viven en el Portal de Autogestión "
                f"de BIND: {PORTALS_LANDING}\n\n"
                "Decime qué necesitás (ej: \"alta de usuario externo\", \"anticipo "
                "de sueldo\", \"problema con un sistema\") y te apunto al portal correcto."
            ),
            "person_to_contact": None,
            "procedure": None,
            "sla": None,
            "insufficient_information": True,
            "referenced_entity_ids": ["tool-jsd-landing"],
            "citations": [],
            "follow_ups": [
                {"text": "¿Cómo pido alta de un colaborador externo?"},
                {"text": "¿Dónde subo un blanqueo de contraseña?"},
                {"text": "¿Qué portal uso para devolver una transferencia inmediata?"},
            ],
            "thinking_trace": None,
            "router_selection": {"source": "portal_router_fallback"},
        }

    top, top_score = matches[0]
    others = [m for m, _ in matches[1:4]]

    summary_lines = [
        f"Para eso usá el portal **{top.name}**.",
        "",
        f"→ {top.url}",
        "",
        f"**Quién lo gestiona:** {top.owner}",
    ]
    if top.request_types:
        summary_lines.append("")
        summary_lines.append("**Tipos de solicitud disponibles:**")
        for t in top.request_types[:8]:
            summary_lines.append(f"• {t}")
        if len(top.request_types) > 8:
            summary_lines.append(f"• … (+{len(top.request_types) - 8} en el portal)")
    if others:
        summary_lines.append("")
        summary_lines.append("**Si lo tuyo era otra cosa, también podría ser:**")
        for p in others:
            summary_lines.append(f"• {p.name} — {p.url}")
    summary_lines.append("")
    summary_lines.append(f"_Catálogo completo: {PORTALS_LANDING}_")

    runner_up = matches[1][1] if len(matches) > 1 else 0
    confidence_gap = top_score - runner_up

    return {
        "summary": "\n".join(summary_lines),
        "person_to_contact": None,
        "procedure": None,
        "sla": None,
        "insufficient_information": False,
        "referenced_entity_ids": [f"tool-jsd-{top.id}"]
        + [f"tool-jsd-{p.id}" for p in others],
        "citations": [
            {
                "text": f"Portal {top.name} — Jira Service Desk de BIND",
                "entity_type": "Tool",
                "entity_id": f"tool-jsd-{top.id}",
                "evidence": {
                    "source_type": "document",
                    "source_id": f"jsd-portal-{top.id}",
                    "quote": (
                        f"Portal '{top.name}' en {PORTALS_LANDING} — "
                        f"gestionado por {top.owner}."
                    ),
                },
            }
        ],
        "follow_ups": [
            {"text": "¿Quién es el dueño de este portal?"},
            {"text": "¿Cuánto suele tardar la respuesta?"},
            {"text": "Mostrame todos los portales disponibles"},
        ],
        "thinking_trace": None,
        "router_selection": {
            "source": "portal_router",
            "matched_portal_id": top.id,
            "score": top_score,
            "confidence_gap": confidence_gap,
        },
    }
