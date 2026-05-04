"""Backend portal-intent classifier — mirrors frontend/lib/portal-router.ts.

End-to-end routing: matches the portal AND the specific request type within
that portal, then returns a deep link to the exact form
(`/servicedesk/customer/portal/{portal_id}/create/{request_type_id}`).

Why two stages: a question like "donde blanqueo mi password" needs to land
the user on Mesa de Ayuda > Colaboradores: Solicitud de servicio IT (rtId
109), not just the Mesa de Ayuda landing page where they'd then have to
choose between 8 forms. Same for SegInfo "alta de un externo de consultora"
→ rtId 1198, not 1123 or 1125.

If the portal is identified but the sub-type isn't certain, we list all
forms in that portal so the user picks. Better than burying them under 50
options in OPR-TC.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Optional


PORTALS_LANDING = "https://bindtm.atlassian.net/servicedesk/customer/portals"


@dataclass
class RequestType:
    rt_id: str
    name: str
    keywords: list[str] = field(default_factory=list)


@dataclass
class Portal:
    id: str
    name: str
    url: str
    owner: str
    keywords: list[str] = field(default_factory=list)
    request_types: list[RequestType] = field(default_factory=list)

    def deep_link(self, rt_id: str) -> str:
        return f"{self.url}/create/{rt_id}"


# ── Portal catalogue with sub-routing ──────────────────────────────────────
# Each request_type's keyword list is intentionally narrow — these only
# disambiguate WITHIN a portal, after the portal-level match already fired.

BLUR_PORTALS: list[Portal] = [
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
            RequestType("109", "Colaboradores: Solicitud de servicio IT", [
                "blanqueo", "blanquear", "password", "contraseña", "clave", "reset",
                "mouse", "teclado", "monitor", "hardware nuevo", "hardware",
                "impresora", "instalar", "instalacion", "instalar software",
                "vpn", "mudanza", "migracion", "accesorio", "perifericos",
                "pedido it", "solicitud it", "solicitud de servicio",
            ]),
            RequestType("110", "Colaboradores: Problema con un sistema, servicio o microinformatica", [
                "no funciona", "no anda", "se cuelga", "se traba", "se rompio",
                "error", "falla", "bug", "no abre", "lento",
                "problema con sistema", "problema con el sistema", "problema con un sistema",
                "problema con servicio", "microinformatica",
            ]),
            RequestType("1512", "Clientes: Cash Dispenser", [
                "cash dispenser", "cash dispenser cliente",
                "cliente cash dispenser", "cliente cash", "cd cliente",
                "dispenser",
            ]),
            RequestType("268", "Clientes: Soporte Banca", [
                "cliente banca", "soporte banca cliente", "homebanking cliente",
            ]),
            RequestType("1151", "Clientes: Solicitudes para Bcollect", [
                "bcollect", "b collect",
            ]),
            RequestType("240", "Call Centers: Soporte a incidentes/solicitudes de clientes", [
                "call center", "callcenter", "incidente call",
            ]),
            RequestType("747", "Proveedores: Solicitud de Soporte IT", [
                "proveedor", "proveedor it", "soporte proveedor",
            ]),
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
            "alta externo", "baja externo", "externo de consultora",
            "acceso a sistema", "acceso a aplicacion", "acceso a un sistema",
            "permiso para",
            "seginfo", "seguridad informacion", "seguridad de la informacion",
            "darle acceso", "dar acceso", "doy acceso", "le doy acceso",
            "dar de alta", "darle de alta", "nuevo empleado", "empleado nuevo",
        ],
        request_types=[
            RequestType("1125", "Alta Colaborador/a Blur", [
                "alta interno", "alta empleado bind", "empleado interno", "alta bind",
                "alta de empleado interno", "alta colaborador interno",
            ]),
            RequestType("1198", "Alta Colaborador/a Externo/a Consultora", [
                "alta consultora", "alta externo consultora", "consultora externa",
                "consultoria", "alta de un externo de consultora",
                "externo de consultora", "consultora", "externo consultora",
            ]),
            RequestType("1123", "Alta Colaborador/a Externo/a Directo", [
                "alta externo directo", "alta directo externo",
                "tercero directo", "alta de tercero",
            ]),
            RequestType("1124", "Baja Colaborador/a Blur", [
                "baja interno", "baja empleado bind", "baja bind",
                "baja de empleado interno", "baja colaborador interno",
            ]),
            RequestType("1199", "Baja Colaborador/a Externo/a Consultora", [
                "baja consultora", "baja externo consultora",
            ]),
            RequestType("1133", "Baja Colaborador/a Externo/a Directo", [
                "baja externo directo", "baja directo externo",
                "baja directo", "directo baja",
            ]),
            RequestType("1285", "Cambio de Puesto Definitivo de Colaboradores/as", [
                "cambio de puesto", "cambio puesto", "cambio de rol",
                "puesto definitivo", "cambio definitivo",
            ]),
            RequestType("1119", "Requerimiento ABM de Perfiles", [
                "abm perfil", "perfil de usuario", "permisos", "permiso para",
                "abm de perfiles", "acceso a sistema", "acceso a aplicacion",
                "darle acceso", "dar acceso",
            ]),
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
            RequestType("1000", "Búsqueda de nuevo colaborador", [
                "busqueda", "abrir busqueda", "buscar colaborador",
                "nueva posicion", "buscar candidato",
            ]),
            RequestType("978", "Solicitud de incorporación de nuevos colaboradores", [
                "incorporacion", "incorporar", "contratar", "hiring",
                "nuevo colaborador", "ingreso",
            ]),
        ],
    ),
    Portal(
        id="53",
        name="Préstamos y Adelantos Blur (RRHH)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/53",
        owner="Capital Humano",
        keywords=[
            "anticipo de sueldo", "adelanto de sueldo", "prestamo personal",
            "aumento limite tarjeta", "aumento limite tc",
            "cambio de domicilio", "cambio domicilio",
            "cobertura de puesto", "rotacion",
        ],
        request_types=[
            RequestType("881", "Solicitud de Anticipo de Sueldo", [
                "anticipo", "adelanto sueldo", "anticipo sueldo", "anticipo de sueldo",
            ]),
            RequestType("880", "Solicitud de Préstamo Personal", [
                "prestamo personal", "prestamo", "credito personal",
            ]),
            RequestType("1230", "Solicitud de Aumento de Límite de TC", [
                "limite tc", "aumento limite", "aumento de limite",
                "aumento limite tarjeta", "aumento limite tc",
                "aumento de limite tarjeta", "aumentar limite",
            ]),
            RequestType("1036", "Formulario de cambio de domicilio", [
                "cambio domicilio", "cambio de domicilio", "actualizar domicilio",
            ]),
            RequestType("1136", "Cobertura de Puesto", [
                "cobertura puesto", "cubrir puesto",
            ]),
            RequestType("1137", "Rotación", [
                "rotacion", "rotar",
            ]),
        ],
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
        request_types=[
            RequestType("1313", "Formulario de Gestión de Fraude", [
                "fraude", "phishing", "estafa", "potencial fraude",
            ]),
        ],
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
        request_types=[RequestType("682", "KYC-USD", ["kyc"])],
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
        request_types=[RequestType("1284", "FORM Control Apertura de Cuenta", ["apertura"])],
    ),
    Portal(
        id="86",
        name="Portal Seguros Blur",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/86",
        owner="Blur Seguros",
        keywords=[
            "seguros", "poliza", "polizas", "asegurados",
            "modificacion de cobertura", "modificacion asegurado",
            "cobro cuotas seguros", "devolucion seguro",
            "reclamo seguros", "siniestro",
        ],
        request_types=[
            RequestType("1274", "Cobro Cuotas Manual", ["cobro cuota", "cobro cuotas", "cuota manual"]),
            RequestType("1278", "Copias de Pólizas/Certificados", ["copia poliza", "certificado poliza", "duplicado poliza"]),
            RequestType("1275", "Devoluciones", ["devolucion seguro"]),
            RequestType("1277", "Legales", ["legales seguro", "oficio judicial seguro"]),
            RequestType("1279", "Modificación de Asegurados", ["modificacion asegurado", "asegurado"]),
            RequestType("1280", "Modificación de Cobertura", ["modificacion cobertura", "cobertura"]),
            RequestType("1276", "Reclamo", ["reclamo", "siniestro"]),
        ],
    ),
    Portal(
        id="70",
        name="Blur PSP (Pagos)",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/70",
        owner="Blur Pagos",
        keywords=[
            "bind psp", "bind pagos", "alta de cliente psp", "baja de cliente psp",
            "pos", "dispositivo pos", "alta pos", "baja pos",
            "qri", "solicitud qri", "integracion pagos",
        ],
        request_types=[
            RequestType("1070", "Alta de Cliente", ["alta cliente psp", "alta de cliente psp"]),
            RequestType("1248", "Baja de Cliente", ["baja cliente psp", "baja de cliente psp"]),
            RequestType("1246", "Alta de Dispositivo POS", ["alta pos", "alta dispositivo pos"]),
            RequestType("1247", "Baja de Dispositivo POS", ["baja pos", "baja dispositivo pos"]),
            RequestType("1249", "Consultas y Reclamos", ["consulta psp", "reclamo psp"]),
            RequestType("1200", "Integraciones", ["integracion", "integraciones"]),
            RequestType("1296", "Nuevo requerimiento", ["nuevo requerimiento psp"]),
            RequestType("1072", "Solicitud de QRI", ["qri", "solicitud qri"]),
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
        request_types=[
            RequestType("0", "Consulta a Cumplimiento", ["cumplimiento", "consulta cumplimiento"]),
            RequestType("0", "Consulta Normativa", ["normativa", "consulta normativa"]),
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
        request_types=[],
    ),
    Portal(
        id="29",
        name="IDCheques",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/29",
        owner="Operaciones",
        keywords=["id cheque", "id de cheque", "idcheques", "id cheques"],
        request_types=[],
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
        request_types=[],
    ),
    Portal(
        id="81",
        name="Gestión de Contratos Blur",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/81",
        owner="Legales / Contratos",
        keywords=["contrato", "nuevo contrato", "alta contrato", "gestion de contratos"],
        request_types=[],
    ),
    Portal(
        id="34",
        name="Remuneración de Cuentas",
        url="https://bindtm.atlassian.net/servicedesk/customer/portal/34",
        owner="Operaciones",
        keywords=["remuneracion cuenta", "remuneracion de cuentas", "tasa cuenta"],
        request_types=[],
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
        request_types=[],
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
            "alta servicio datanet", "alta de servicio datanet",
            "datanet servicio", "alta servicio", "datanet alta",
            "swift", "mt940",
            "mep devolucion", "transferencia inmediata",
            "balanceo atm", "tdv",
            "tarjeta regalo", "anticipo de cupones",
            "gdh alta", "gdh aumento limite", "gdh baja",
            "garantias consultas",
        ],
        request_types=[
            RequestType("586", "TR.Pedido Tarjeta Regalo", ["tarjeta regalo", "regalo"]),
            RequestType("587", "TR.Reemplazo de Tarjeta Regalo", ["reemplazo tarjeta regalo"]),
            RequestType("610", "MEP.Devolución Transferencia Inmediata", ["devolucion transferencia inmediata", "devolver transferencia"]),
            RequestType("609", "MEP.Devolución", ["mep devolucion"]),
            RequestType("611", "MEP.Nro de MEP", ["numero de mep", "nro de mep"]),
            RequestType("577", "GDH - Alta", ["gdh alta", "alta gdh"]),
            RequestType("575", "GDH - Aumento de límite", ["gdh aumento", "aumento limite gdh"]),
            RequestType("579", "GDH - Baja por desvinculación", ["gdh baja", "baja gdh"]),
            RequestType("576", "GDH - Solicitud de adicionales", ["gdh adicional", "adicional gdh"]),
            RequestType("608", "Swift.ALTA MT940", ["swift", "mt940", "alta mt940"]),
            RequestType("582", "TD.Balanceo ATM", ["balanceo atm", "balanceo de atm"]),
            RequestType("583", "TD.TDV - ABM", ["tdv abm", "abm tdv"]),
            RequestType("572", "TC.ABM línea anticipo de cupones", ["anticipo cupones", "linea anticipo"]),
            RequestType("574", "TC.Tratamiento de FALLECIDOS", ["fallecido tc", "fallecidos tc"]),
            RequestType("601", "Datanet.Alta Servicio", [
                "datanet alta servicio", "alta servicio datanet",
                "alta de servicio datanet", "datanet servicio",
                "alta servicio en datanet",
            ]),
            RequestType("602", "Datanet.Alta Cuenta Relacionada", [
                "datanet alta relacionada", "alta cuenta relacionada datanet",
                "datanet relacionada",
            ]),
            RequestType("604", "Datanet.Alta Cuenta Vinculada", [
                "datanet alta vinculada", "alta cuenta vinculada datanet",
                "datanet vinculada",
            ]),
            RequestType("607", "Datanet.Devoluciones", ["datanet devolucion"]),
            RequestType("560", "Clientes.ABM de Empleados Blur", ["abm empleados bind"]),
            RequestType("561", "Clientes.ABM de Tarjetas Virtuales y B24", ["tarjeta virtual", "abm b24"]),
            RequestType("558", "Clientes.ABM de Cuentas Comitentes", ["abm cuenta comitente"]),
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
            RequestType("684", "Beneficio Discapacidad", ["beneficio discapacidad", "discapacidad"]),
            RequestType("909", "Bloqueo telefónico", ["bloqueo telefonico"]),
            RequestType("1011", "Aumento de límite de extracción", ["limite de extraccion", "aumento extraccion"]),
            RequestType("1127", "Certificación de Saldos", ["certificacion saldos", "certificacion de saldos"]),
            RequestType("800", "Cobranzas Préstamo", ["cobranza prestamo", "cobranzas prestamo"]),
            RequestType("1097", "COMEX - Consultas", ["comex consulta", "consulta comex"]),
            RequestType("915", "Adelanto", ["adelanto"]),
            RequestType("1006", "Apoderados", ["apoderados", "apoderado"]),
            RequestType("1908", "Atención de Derecho de titulares de Datos", ["derecho titulares", "datos personales", "derecho de titular"]),
            RequestType("1128", "Alta Blur24 –empresas/ zafiro", ["alta bind24"]),
            RequestType("937", "Baja Blur24", ["baja bind24"]),
            RequestType("1126", "Actualización de Clientes", ["actualizacion cliente"]),
            RequestType("931", "Alta cuenta comitente", ["alta cuenta comitente"]),
            RequestType("1129", "Alta cuenta GALLO - FPA", ["gallo fpa"]),
            RequestType("1086", "Baja Júbilo Acreditado", ["baja jubilo acreditado"]),
            RequestType("1074", "Baja Júbilo CALL", ["baja jubilo call"]),
            RequestType("1130", "Bonificaciones", ["bonificacion", "bonificaciones"]),
            RequestType("1077", "Consultas", ["consulta general"]),
            RequestType("1078", "Consultas Urgentes", ["consulta urgente"]),
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
        request_types=[],
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
        request_types=[],
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
        request_types=[],
    ),
]


# ── Intent detection ───────────────────────────────────────────────────────

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
    re.compile(r"\b(alta|baja)\b.*\b(externo|consultora|tercero)\b"),
    re.compile(r"\bnecesito\s+(un\s+|una\s+)?acceso\b"),
    re.compile(r"\baumento\s+(de\s+)?limite\b"),
]


# ── Normalizer ─────────────────────────────────────────────────────────────

_STOPWORDS_RE = re.compile(
    r"\b(?:de|del|a|al|el|la|los|las|un|una|unos|unas|para|con|por|en|sobre|mi|mis|tu|tus|le|me)\b",
    re.IGNORECASE,
)


def _normalize(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[¿?¡!.,;:()\"/]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    # Collapse stopwords so "alta de un colaborador" -> "alta colaborador",
    # "aumento de limite tarjeta" -> "aumento limite tarjeta", etc. Both
    # sides of the substring match get this treatment so the keywords
    # below don't need every preposition variant.
    s = _STOPWORDS_RE.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _looks_like_portal_question(q_norm: str) -> bool:
    return any(p.search(q_norm) for p in INTENT_PATTERNS)


# ── Scoring ────────────────────────────────────────────────────────────────

def _score_keywords(q_norm: str, keywords: list[str]) -> int:
    score = 0
    for k in keywords:
        nk = _normalize(k)
        if not nk:
            continue
        if nk in q_norm:
            score += len(nk.split()) * 2
    return score


def _score_portal(q_norm: str, p: Portal) -> int:
    score = _score_keywords(q_norm, p.keywords)
    if _normalize(p.name) in q_norm:
        score += 5
    return score


def _rank_portals(q_norm: str) -> list[tuple[Portal, int]]:
    ranked = [(p, _score_portal(q_norm, p)) for p in BLUR_PORTALS]
    ranked = [x for x in ranked if x[1] > 0]
    ranked.sort(key=lambda x: -x[1])
    return ranked


_VERB_STEMS = [
    ("baja", "baja"),
    ("alta", "alta"),
    ("modific", "modific"),
    ("consult", "consult"),
    ("aumento", "aumento"),
    ("solicitud", "solicit"),
    ("cambio", "cambio"),
    ("anulacion", "anula"),
    ("devolucion", "devolu"),
    ("reclamo", "reclamo"),
]


def _verb_alignment_bonus(q_norm: str, rt_name: str) -> int:
    """If the question and the request_type name share the same verb stem
    (e.g. both contain 'baja'), grant a +5 bonus. Prevents 'Alta' RTs from
    winning when the user said 'baja' and vice-versa."""
    rt_norm = _normalize(rt_name)
    bonus = 0
    for q_stem, rt_stem in _VERB_STEMS:
        if q_stem in q_norm and rt_stem in rt_norm:
            bonus += 5
    return bonus


def _best_request_type(q_norm: str, p: Portal) -> Optional[tuple[RequestType, int]]:
    """Returns the request type within `p` that best matches q_norm, or None
    if no sub-keyword scored. Filters out RequestType entries with rt_id='0'
    (placeholders for portals where Atlassian didn't expose the rt id)."""
    candidates: list[tuple[RequestType, int]] = []
    for rt in p.request_types:
        if not rt.keywords or rt.rt_id == "0":
            continue
        kw_score = _score_keywords(q_norm, rt.keywords)
        if kw_score == 0:
            continue
        total = kw_score + _verb_alignment_bonus(q_norm, rt.name)
        candidates.append((rt, total))
    if not candidates:
        return None
    candidates.sort(key=lambda x: -x[1])
    return candidates[0]


# ── Public API ─────────────────────────────────────────────────────────────

def match_portal_intent(question: str) -> Optional[dict[str, Any]]:
    """End-to-end portal+request_type classifier.

    Returns Answer-shaped dict (matches qa_agent.answer_query output) or None.

    Two firing conditions:
      1. Question matches an INTENT_PATTERN.
      2. A multi-word portal keyword scores >= 4.
    """
    if not question or len(question) < 4:
        return None

    q_norm = _normalize(question)
    matches = _rank_portals(q_norm)
    intent_match = _looks_like_portal_question(q_norm)
    strong_keyword = bool(matches) and matches[0][1] >= 4

    if not (intent_match or strong_keyword):
        return None

    if not matches:
        return _fallback_to_landing()

    top_portal, top_score = matches[0]
    others = [m for m, _ in matches[1:4]]
    rt_match = _best_request_type(q_norm, top_portal)

    summary_lines: list[str] = []

    if rt_match is not None:
        rt, _rt_score = rt_match
        summary_lines.append(
            f"Para eso usá **{top_portal.name} → {rt.name}**."
        )
        summary_lines.append("")
        summary_lines.append(f"→ {top_portal.deep_link(rt.rt_id)}")
        summary_lines.append("")
        summary_lines.append(f"**Quién lo gestiona:** {top_portal.owner}")

        # If there are other plausible request types in the same portal, list a
        # couple so the user can self-correct without going back.
        siblings = [
            x
            for x in top_portal.request_types
            if x.rt_id not in ("0", rt.rt_id) and x.keywords
        ][:4]
        if siblings:
            summary_lines.append("")
            summary_lines.append(
                f"_Otros formularios del mismo portal por si era otra cosa:_"
            )
            for sib in siblings:
                summary_lines.append(f"• {sib.name} — {top_portal.deep_link(sib.rt_id)}")
    else:
        # Couldn't disambiguate the sub-type. Land them on the portal and list
        # the request types we know about.
        summary_lines.append(f"Para eso usá el portal **{top_portal.name}**.")
        summary_lines.append("")
        summary_lines.append(f"→ {top_portal.url}")
        summary_lines.append("")
        summary_lines.append(f"**Quién lo gestiona:** {top_portal.owner}")
        if top_portal.request_types:
            summary_lines.append("")
            summary_lines.append("**Tipos de solicitud disponibles:**")
            for rt in top_portal.request_types[:8]:
                if rt.rt_id != "0":
                    summary_lines.append(f"• {rt.name} — {top_portal.deep_link(rt.rt_id)}")
                else:
                    summary_lines.append(f"• {rt.name}")
            if len(top_portal.request_types) > 8:
                summary_lines.append(f"• … (+{len(top_portal.request_types) - 8} en el portal)")

    if others:
        summary_lines.append("")
        summary_lines.append("**Si era de otra área, también podría ser:**")
        for p in others:
            summary_lines.append(f"• {p.name} — {p.url}")

    summary_lines.append("")
    summary_lines.append(f"_Catálogo completo: {PORTALS_LANDING}_")

    referenced = [f"tool-jsd-{top_portal.id}"]
    if rt_match is not None:
        referenced.append(f"tt-jsd-{top_portal.id}-{rt_match[0].rt_id}")
    referenced.extend(f"tool-jsd-{p.id}" for p in others)

    selection: dict[str, Any] = {
        "source": "portal_router",
        "matched_portal_id": top_portal.id,
        "score": top_score,
    }
    if rt_match is not None:
        selection["matched_request_type_id"] = rt_match[0].rt_id
        selection["matched_request_type_name"] = rt_match[0].name
        selection["request_type_score"] = rt_match[1]

    return {
        "summary": "\n".join(summary_lines),
        "person_to_contact": None,
        "procedure": None,
        "sla": None,
        "insufficient_information": False,
        "referenced_entity_ids": referenced,
        "citations": [
            {
                "text": f"Portal {top_portal.name} — Jira Service Desk de Blur",
                "entity_type": "Tool",
                "entity_id": f"tool-jsd-{top_portal.id}",
                "evidence": {
                    "source_type": "document",
                    "source_id": f"jsd-portal-{top_portal.id}",
                    "quote": (
                        f"Portal '{top_portal.name}' en {PORTALS_LANDING} — "
                        f"gestionado por {top_portal.owner}."
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
        "router_selection": selection,
    }


def _fallback_to_landing() -> dict[str, Any]:
    return {
        "summary": (
            "No te puedo precisar el portal exacto sin más contexto, pero "
            "todos los portales del banco viven en el Portal de Autogestión "
            f"de Blur: {PORTALS_LANDING}\n\n"
            "Decime qué necesitás (ej: \"alta de un externo de consultora\", "
            "\"anticipo de sueldo\", \"problema con un sistema\") y te apunto "
            "al formulario correcto."
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
