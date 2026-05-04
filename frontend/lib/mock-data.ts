import type { Person, Integration, QAAnswer } from "./types";

// ─── Blur — 12 empleados sintéticos del banco cliente ──────────────────

export const ORGANIZATION = {
  id: "bind",
  name: "Blur Bank",
  full_name: "Banco Industrial",
  domain: "bind.com.ar",
  industry: "Banca",
  size: 600,
};

export const PEOPLE: Person[] = [
  {
    id: "ceo_01",
    name: "Mariana Torres",
    role: "CEO",
    area: "Executive",
    email: "mariana@bind.com.ar",
    phone: "+5491100000001",
    direct_reports: ["cto_01", "vp_risk", "cfo_01", "gte_ops", "hr_lead"],
    expertise_areas: ["Strategy", "Board"],
    interviewed: true,
  },
  {
    id: "cto_01",
    name: "Juan Pérez",
    role: "CTO",
    area: "Technology",
    email: "juan@bind.com.ar",
    phone: "+5491100000002",
    manager_id: "ceo_01",
    direct_reports: ["sysadmin"],
    expertise_areas: ["Architecture", "Cloud", "Vendor management"],
    interviewed: true,
  },
  {
    id: "vp_risk",
    name: "Carlos Méndez",
    role: "VP of Risk",
    area: "Risk",
    email: "carlos@bind.com.ar",
    phone: "+5491100000003",
    manager_id: "ceo_01",
    direct_reports: ["gte_credit"],
    expertise_areas: ["Credit risk", "BCRA Compliance", "Credit Committee"],
    interviewed: true,
  },
  {
    id: "cfo_01",
    name: "Laura Gómez",
    role: "CFO",
    area: "Finance",
    email: "laura@bind.com.ar",
    phone: "+5491100000004",
    manager_id: "ceo_01",
    expertise_areas: ["Treasury", "BCRA Reporting", "Audit"],
    interviewed: false,
  },
  {
    id: "gte_credit",
    name: "Ana López",
    role: "Credit Manager",
    area: "Risk",
    email: "ana@bind.com.ar",
    phone: "+5491100000005",
    manager_id: "vp_risk",
    direct_reports: ["analyst_sr", "analyst_jr"],
    expertise_areas: [
      "Salesforce Credits",
      "Exception approval",
      "Credit policy",
    ],
    interviewed: true,
  },
  {
    id: "gte_ops",
    name: "Diego Ramírez",
    role: "Operations Manager",
    area: "Operations",
    email: "diego@bind.com.ar",
    phone: "+5491100000006",
    manager_id: "ceo_01",
    direct_reports: ["account_off", "backoffice"],
    expertise_areas: ["Operational processes", "Client SLAs"],
    interviewed: true,
  },
  {
    id: "analyst_sr",
    name: "Martín Suárez",
    role: "Senior Credit Analyst",
    area: "Risk",
    email: "martin@bind.com.ar",
    manager_id: "gte_credit",
    expertise_areas: ["Credit evaluation", "Collateral", "Score Blur"],
    interviewed: true,
  },
  {
    id: "analyst_jr",
    name: "Diego Herrera",
    role: "Credit Analyst",
    area: "Risk",
    email: "diego.h@bind.com.ar",
    manager_id: "gte_credit",
    expertise_areas: ["Credit evaluation"],
    interviewed: false,
  },
  {
    id: "account_off",
    name: "Roberto Pascual",
    role: "Account Officer",
    area: "Operations",
    email: "roberto@bind.com.ar",
    manager_id: "gte_ops",
    expertise_areas: ["Client complaints", "In-person service", "Consumer defense"],
    interviewed: true,
  },
  {
    id: "backoffice",
    name: "Sofía Méndez",
    role: "Operations Backoffice",
    area: "Operations",
    email: "sofia@bind.com.ar",
    manager_id: "gte_ops",
    expertise_areas: ["SharePoint clients", "Document verification"],
    interviewed: true,
  },
  {
    id: "sysadmin",
    name: "Tomás Ledesma",
    role: "Sysadmin / IT",
    area: "Technology",
    email: "tomas@bind.com.ar",
    manager_id: "cto_01",
    expertise_areas: [
      "Salesforce admin",
      "SharePoint admin",
      "VPN",
      "Tech onboarding",
      "AWS",
    ],
    interviewed: true,
  },
  {
    id: "hr_lead",
    name: "Valeria Ríos",
    role: "HR Lead",
    area: "HR",
    email: "valeria@bind.com.ar",
    manager_id: "ceo_01",
    expertise_areas: [
      "Employee onboarding",
      "Benefits",
      "Leaves",
      "Culture",
    ],
    interviewed: false,
  },
];

export function findPerson(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id);
}

export function activeUser(): Person {
  // Default user "logueado" para la demo
  return PEOPLE.find((p) => p.id === "analyst_jr")!;
}

// ─── SISTEMAS / TOOLS de Blur Bank ──────────────────────────────────

export interface ToolEntity {
  id: string;
  name: string;
  category: string;
  purpose: string;
  owner_id: string;
  used_by_areas: string[];
  access_path: string;
  sla: string;
}

export const TOOLS: ToolEntity[] = [
  {
    id: "salesforce_creditos",
    name: "Salesforce — Credit module",
    category: "CRM",
    purpose: "Credit applications and approval management",
    owner_id: "gte_credit",
    used_by_areas: ["Risk", "Operations"],
    access_path: "Email Ana López with manager in CC",
    sla: "24-48 hrs",
  },
  {
    id: "sharepoint_clientes",
    name: "SharePoint — Clients Folder",
    category: "Documents",
    purpose: "Legal files and client documentation",
    owner_id: "sysadmin",
    used_by_areas: ["Operations", "Legal"],
    access_path: "Open JIRA ticket with manager in CC",
    sla: "Same day",
  },
  {
    id: "veraz_api",
    name: "Veraz API",
    category: "External",
    purpose: "External credit score lookup",
    owner_id: "analyst_sr",
    used_by_areas: ["Risk"],
    access_path: "Auto-provisioned via Salesforce",
    sla: "Immediate",
  },
  {
    id: "score_bind",
    name: "Score Blur",
    category: "Internal scoring",
    purpose: "Internal credit score (Veraz × 0.6 + Tenure × 0.3 + Balance × 0.1)",
    owner_id: "vp_risk",
    used_by_areas: ["Risk"],
    access_path: "Built into the Salesforce Credit module",
    sla: "—",
  },
  {
    id: "jira",
    name: "JIRA",
    category: "Tickets",
    purpose: "IT tickets, bugs, operational requirements",
    owner_id: "sysadmin",
    used_by_areas: ["Technology", "Operations"],
    access_path: "Auto-provisioned with @bind.com.ar email",
    sla: "Immediate",
  },
  {
    id: "google_workspace",
    name: "Google Workspace",
    category: "Productivity",
    purpose: "Gmail, Drive, Calendar, Meet — general productivity",
    owner_id: "sysadmin",
    used_by_areas: ["All"],
    access_path: "Auto-provisioned during onboarding",
    sla: "Day 1",
  },
  {
    id: "aws_console",
    name: "AWS Console",
    category: "Infra",
    purpose: "Cloud infrastructure — ECS, RDS, S3, IAM",
    owner_id: "cto_01",
    used_by_areas: ["Technology"],
    access_path: "Request to CTO + security training",
    sla: "3-5 days",
  },
  {
    id: "notion",
    name: "Notion",
    category: "Wiki",
    purpose: "Internal docs, meeting notes, runbooks",
    owner_id: "ceo_01",
    used_by_areas: ["All"],
    access_path: "Email to workspace admin",
    sla: "Same day",
  },
  {
    id: "salesforce_crm",
    name: "Salesforce CRM",
    category: "CRM",
    purpose: "Accounts, opportunities, commercial pipeline",
    owner_id: "gte_ops",
    used_by_areas: ["Commercial", "Operations"],
    access_path: "Request to the Operations Manager",
    sla: "24 hrs",
  },
  {
    id: "workday",
    name: "Workday",
    category: "HR",
    purpose: "HR system — leaves, benefits, payroll",
    owner_id: "hr_lead",
    used_by_areas: ["All"],
    access_path: "Auto-provisioned during onboarding",
    sla: "Day 1",
  },
  {
    id: "slack_workspace",
    name: "Slack",
    category: "Communication",
    purpose: "Internal communication and operational channels",
    owner_id: "cto_01",
    used_by_areas: ["All"],
    access_path: "Automatic invite via corporate email",
    sla: "Immediate",
  },
  {
    id: "datadog",
    name: "Datadog",
    category: "Observability",
    purpose: "Infrastructure and application monitoring",
    owner_id: "sysadmin",
    used_by_areas: ["Technology"],
    access_path: "Request to Sysadmin",
    sla: "1-2 days",
  },
];

// ─── PROCESOS de Blur Bank ──────────────────────────────────────────

export interface ProcessEntity {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  participants: string[];
  area: string;
  steps: number;
  sla: string;
}

export const PROCESSES: ProcessEntity[] = [
  {
    id: "credit_approval",
    name: "Personal credit approval",
    description: "Evaluation and approval of personal credits under $5M ARS",
    owner_id: "gte_credit",
    participants: ["analyst_sr", "analyst_jr", "account_off"],
    area: "Risk",
    steps: 7,
    sla: "72 business hrs",
  },
  {
    id: "client_onboarding_pyme",
    name: "SMB client onboarding",
    description: "SMB client onboarding — KYC + account opening + officer assignment",
    owner_id: "gte_ops",
    participants: ["account_off", "backoffice"],
    area: "Operations",
    steps: 9,
    sla: "5 business days",
  },
  {
    id: "vendor_contract_approval",
    name: "Vendor contract approval",
    description: "Legal and financial contract review. CFO + CEO sign if > USD 50K",
    owner_id: "cfo_01",
    participants: ["ceo_01", "vp_risk"],
    area: "Finance",
    steps: 5,
    sla: "10 business days",
  },
  {
    id: "complaint_handling",
    name: "Client complaint handling",
    description: "Formal complaint handling — standard script, escalation to Compliance/Legal",
    owner_id: "account_off",
    participants: ["gte_ops", "vp_risk"],
    area: "Operations",
    steps: 6,
    sla: "48 hrs first response",
  },
  {
    id: "user_onboarding_it",
    name: "IT user provisioning",
    description: "Account provisioning (email, Salesforce, SharePoint, VPN) for new employee",
    owner_id: "sysadmin",
    participants: ["hr_lead"],
    area: "Technology",
    steps: 8,
    sla: "Day 1 (official), 2-3 days in practice",
  },
  {
    id: "document_verification",
    name: "Document verification",
    description: "Validation of ID, tax ID, pay stubs, tax returns",
    owner_id: "backoffice",
    participants: ["analyst_jr"],
    area: "Operations",
    steps: 4,
    sla: "24 hrs",
  },
  {
    id: "exception_approval",
    name: "Credit exception approval",
    description: "Cases outside standard policy — Credit Manager discretion",
    owner_id: "gte_credit",
    participants: ["vp_risk", "analyst_sr"],
    area: "Risk",
    steps: 3,
    sla: "Same day",
  },
  {
    id: "refinancing",
    name: "Debt refinancing",
    description: "Renegotiation of active credits with clients in good standing",
    owner_id: "analyst_sr",
    participants: ["gte_credit", "account_off"],
    area: "Risk",
    steps: 5,
    sla: "5 business days",
  },
  {
    id: "employee_onboarding",
    name: "New employee onboarding",
    description: "HR process for new employees — hiring, benefits, initial training",
    owner_id: "hr_lead",
    participants: ["sysadmin", "ceo_01"],
    area: "HR",
    steps: 12,
    sla: "First week",
  },
  {
    id: "monthly_close",
    name: "Monthly accounting close",
    description: "Account reconciliation, BCRA reporting, internal balance",
    owner_id: "cfo_01",
    participants: [],
    area: "Finance",
    steps: 14,
    sla: "5 business days after close",
  },
  {
    id: "vendor_payments",
    name: "Vendor payments",
    description: "Invoice processing, approvals and transfers",
    owner_id: "cfo_01",
    participants: ["backoffice"],
    area: "Finance",
    steps: 6,
    sla: "30 days from invoice receipt",
  },
  {
    id: "incident_response",
    name: "IT incident response",
    description: "Triage, escalation and resolution of infrastructure incidents",
    owner_id: "sysadmin",
    participants: ["cto_01"],
    area: "Technology",
    steps: 5,
    sla: "P1: 1h · P2: 4h · P3: 24h",
  },
];

export function findTool(id: string): ToolEntity | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function findProcess(id: string): ProcessEntity | undefined {
  return PROCESSES.find((p) => p.id === id);
}

// ─── INTEGRACIONES ──────────────────────────────────────────────────

type IntegrationDef = Omit<Integration, "description"> & {
  description: { es: string; en: string };
};

const INTEGRATIONS_RAW: IntegrationDef[] = [
  // ─── ACTIVOS (configurados) ────────────────────────────────────────
  {
    id: "slack",
    name: "Slack",
    category: "channel",
    status: "active",
    description: {
      es: "Bot que responde DM y menciones en Slack. Auto-instalable desde el App Directory.",
      en: "Bot that answers DMs and mentions in Slack. One-click install from the App Directory.",
    },
    logoKey: "slack",
  },
  {
    id: "google_sso",
    name: "Google Workspace SSO",
    category: "identity",
    status: "connected",
    description: {
      es: "Login y permisos via Google Workspace. Domain-wide delegation soportado.",
      en: "Login and permissions via Google Workspace. Domain-wide delegation supported.",
    },
    logoKey: "google_drive",
  },

  // ─── DISPONIBLES ───────────────────────────────────────────────────
  {
    id: "google_chat",
    name: "Google Chat",
    category: "channel",
    status: "available",
    description: {
      es: "Bot que responde DM y menciones en tus canales de Google Chat. Auth via Workspace.",
      en: "Bot that answers DMs and mentions in your Google Chat spaces. Auth via Workspace.",
    },
    logoKey: "google_chat",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    category: "source",
    status: "available",
    description: {
      es: "Indexamos docs, sheets y slides de carpetas que selecciones. Re-sync incremental.",
      en: "We index docs, sheets and slides from folders you choose. Incremental re-sync.",
    },
    logoKey: "google_drive",
  },
  {
    id: "notion",
    name: "Notion",
    category: "source",
    status: "available",
    description: {
      es: "Sync de databases y pages con permission-aware extraction.",
      en: "Sync of databases and pages with permission-aware extraction.",
    },
    logoKey: "notion",
  },
  {
    id: "confluence",
    name: "Confluence",
    category: "source",
    status: "available",
    description: {
      es: "Spaces y páginas con dueños y last-modified intactos para auditoría.",
      en: "Spaces and pages with owners and last-modified preserved for audit.",
    },
    logoKey: "confluence",
  },
  {
    id: "jira",
    name: "Jira",
    category: "source",
    status: "available",
    description: {
      es: "Tickets, projects y workflows. Útil para ticket types y routing.",
      en: "Tickets, projects and workflows. Useful for ticket types and routing.",
    },
    logoKey: "jira",
  },
  {
    id: "asana",
    name: "Asana",
    category: "source",
    status: "available",
    description: {
      es: "Tasks, projects y portfolios. Sync con permissions intactos.",
      en: "Tasks, projects and portfolios. Sync with permissions preserved.",
    },
    logoKey: "asana",
  },
  {
    id: "monday",
    name: "Monday.com",
    category: "source",
    status: "available",
    description: {
      es: "Boards, items y workflows de Monday. Bidirectional sync opcional.",
      en: "Monday boards, items and workflows. Optional bidirectional sync.",
    },
    logoKey: "monday",
  },
  {
    id: "linear",
    name: "Linear",
    category: "source",
    status: "available",
    description: {
      es: "Issues, projects y cycles. Atlas para teams técnicos.",
      en: "Issues, projects and cycles. Atlas for technical teams.",
    },
    logoKey: "linear",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "source",
    status: "available",
    description: {
      es: "People, accounts y opportunities. Capa CRM al grafo del Brain.",
      en: "People, accounts and opportunities. CRM layer over the Brain graph.",
    },
    logoKey: "salesforce",
  },
  {
    id: "ms_sso",
    name: "Microsoft 365 SSO",
    category: "identity",
    status: "available",
    description: {
      es: "Login via Azure AD / Entra ID. Soporta MFA y conditional access.",
      en: "Login via Azure AD / Entra ID. Supports MFA and conditional access.",
    },
    logoKey: "ms_office",
  },
  {
    id: "okta",
    name: "Okta",
    category: "identity",
    status: "available",
    description: {
      es: "SAML 2.0 + SCIM provisioning. Para empresas que usan Okta como IdP.",
      en: "SAML 2.0 + SCIM provisioning. For companies using Okta as IdP.",
    },
    logoKey: "okta",
  },

  // ─── PRÓXIMAMENTE ──────────────────────────────────────────────────
  {
    id: "ms_teams",
    name: "Microsoft Teams",
    category: "channel",
    status: "coming_soon",
    description: {
      es: "Bot Framework con SSO Azure AD. Disponible Q3 2026.",
      en: "Bot Framework with Azure AD SSO. Available Q3 2026.",
    },
    logoKey: "ms_teams",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "channel",
    status: "coming_soon",
    description: {
      es: "Tu Brain accesible vía WhatsApp para empleados en campo. Q3 2026.",
      en: "Your Brain accessible via WhatsApp for field employees. Q3 2026.",
    },
    logoKey: "whatsapp",
  },
  {
    id: "zoom",
    name: "Zoom",
    category: "source",
    status: "coming_soon",
    description: {
      es: "Transcripts de meetings con consentimiento. Captura decisiones operativas.",
      en: "Meeting transcripts with consent. Captures operational decisions.",
    },
    logoKey: "zoom",
  },
];

export const INTEGRATIONS_DEFS = INTEGRATIONS_RAW;

// Backwards-compatible flat array using ES descriptions by default.
export const INTEGRATIONS: Integration[] = INTEGRATIONS_RAW.map((i) => ({
  ...i,
  description: i.description.es,
}));

// ─── 4 CASOS DEMO con respuestas pre-computed ─────────────────────────

export const DEMO_QUERIES: Record<string, QAAnswer> = {
  // CASO 1 — Trojan horse: acceso a sistemas
  "necesito acceso a salesforce": {
    answer:
      "Para acceso al módulo de Créditos en Salesforce, pediselo a **Ana López** (Gerente de Créditos, Riesgos). Mandale un email a ana@bind.com.ar con tu manager en copia y especificando qué nivel de acceso necesitás (lectura / edición / aprobación). El SLA típico es 24-48hs hábiles.\n\nSi también necesitás acceso a SharePoint para los expedientes de clientes, eso lo maneja **Tomás Ledesma** (Sysadmin) — abrí un ticket en Jira y poné a tu manager en CC.",
    answer_type: "access_path",
    entities_referenced: [
      { type: "Person", id: "gte_credit", name: "Ana López" },
      { type: "Person", id: "sysadmin", name: "Tomás Ledesma" },
      { type: "Tool", id: "salesforce", name: "Salesforce Credits" },
      { type: "Tool", id: "sharepoint", name: "SharePoint" },
    ],
    citations: [
      {
        text: "Ana López como aprobador de Salesforce módulo Créditos",
        entity_type: "Person",
        entity_id: "gte_credit",
        evidence: {
          source_type: "interview",
          source_id: "interview_ana_lopez",
          speaker: "Ana López",
          timestamp_seconds: 187,
          quote:
            "para acceso a Salesforce módulo Créditos me lo piden a mí, tarda 24-48hs, mandan email con manager en copia",
        },
      },
      {
        text: "Tomás Ledesma maneja accesos de IT",
        entity_type: "Person",
        entity_id: "sysadmin",
        evidence: {
          source_type: "interview",
          source_id: "interview_tomas_ledesma",
          speaker: "Tomás Ledesma",
          timestamp_seconds: 142,
          quote:
            "SharePoint y VPN soy yo, abren ticket en Jira con el manager en CC y lo proceso en el día",
        },
      },
    ],
    follow_up_suggestions: [
      "¿Necesito acceso a algún otro sistema típico de mi rol?",
      "¿Quién me da el onboarding inicial cuando entro al equipo?",
    ],
    confidence: 0.94,
  },

  // CASO 2 — Lookup de persona / routing
  "cliente enojado por rechazo": {
    answer:
      "Los reclamos de clientes los maneja **Roberto Pascual** (Oficial de Cuentas, Operaciones). Tiene un script estándar para el primer contacto.\n\n**Lo crítico**: nunca le digas al cliente el score crediticio ni que \"quedó debajo\". Es norma del BCRA y política interna. La frase oficial que usa Roberto es: *\"En este momento las condiciones de la operación no se ajustan a nuestra política crediticia vigente. Puede volver a solicitar en 90 días\"*.\n\nSi el cliente menciona defensa al consumidor o un reclamo formal, derivá el caso a **Legales + Compliance** — el Oficial no maneja eso solo.",
    answer_type: "routing",
    entities_referenced: [
      { type: "Person", id: "account_off", name: "Roberto Pascual" },
    ],
    citations: [
      {
        text: "Roberto Pascual maneja reclamos por rechazo crediticio",
        entity_type: "Person",
        entity_id: "account_off",
        evidence: {
          source_type: "interview",
          source_id: "interview_roberto_pascual",
          speaker: "Roberto Pascual",
          timestamp_seconds: 218,
          quote:
            "cuando un cliente reclama por un rechazo, yo lo manejo, tengo un script, pero si escala a defensa al consumidor lo paso a Compliance",
        },
      },
      {
        text: "Política de no mencionar score al cliente",
        entity_type: "InformalRule",
        entity_id: "no_mencionar_score",
        evidence: {
          source_type: "interview",
          source_id: "interview_ana_lopez",
          speaker: "Ana López",
          timestamp_seconds: 322,
          quote:
            "nunca digas el score, ni el número ni que quedó debajo, es norma del BCRA",
        },
      },
    ],
    follow_up_suggestions: [
      "¿Cuál es el script exacto que usa Roberto?",
      "¿Quién recibe el caso si escala a Legales?",
    ],
    confidence: 0.91,
  },

  // CASO 3 — Conocimiento informal con conflicto
  "cuanto tarda el alta de usuario": {
    answer:
      "Acá hay una diferencia entre el SLA oficial y la realidad — te paso ambas:",
    answer_type: "informal_rule",
    entities_referenced: [
      { type: "Person", id: "sysadmin", name: "Tomás Ledesma" },
      { type: "Person", id: "gte_ops", name: "Diego Ramírez" },
    ],
    citations: [],
    conflicting_sources: [
      {
        source: "Diego Ramírez (Gte de Operaciones)",
        claim:
          "El SLA oficial documentado es de 24hs hábiles desde la apertura del ticket.",
      },
      {
        source: "Tomás Ledesma (Sysadmin) — entrevista, regla informal",
        claim:
          "En la práctica son 2-3 días hábiles porque dependo de aprobación del manager + curso de seguridad. Si es urgente, decí que es urgente y lo hago en el día.",
      },
    ],
    follow_up_suggestions: [
      "¿Cómo le marco a Tomás que un alta es urgente?",
      "¿Qué cosas requieren curso de seguridad?",
    ],
    confidence: 0.88,
  },

  // CASO 4 — KNOWLEDGE GAP HONESTO (el WOW de la demo)
  "politica de licencia por paternidad": {
    answer:
      "No tengo eso en el Brain todavía — ninguna de las entrevistas hechas hasta ahora cubrió políticas de licencias.\n\nLa persona que más probablemente tenga la respuesta es **Valeria Ríos**, Líder de RRHH. Su contacto es valeria@bind.com.ar. Ella todavía no fue entrevistada por Company Brain, pero figura en el organigrama como dueña del área de RRHH y tiene experiencia documentada en onboarding, beneficios y licencias.\n\nUna vez que Valeria sea entrevistada, esta pregunta queda respondida automáticamente para todos.",
    answer_type: "unknown",
    entities_referenced: [
      { type: "Person", id: "hr_lead", name: "Valeria Ríos" },
    ],
    citations: [
      {
        text: "Valeria Ríos como referente de RRHH",
        entity_type: "Person",
        entity_id: "hr_lead",
        evidence: {
          source_type: "org_chart",
          source_id: "bind_org_chart_v1",
          quote:
            "Valeria Ríos, Líder de RRHH, area RRHH, manager_id ceo_01, expertise: onboarding, beneficios, licencias",
        },
      },
    ],
    follow_up_suggestions: [
      "¿Podés agendar una entrevista con Valeria?",
      "¿Qué otras áreas no cubrí todavía?",
    ],
    confidence: 0.42,
    insufficient_information: true,
  },
};

// Mapping de "input del usuario" → key del demo
export function matchDemoQuery(input: string): string | null {
  const lower = input.toLowerCase();
  if (
    lower.includes("salesforce") ||
    lower.includes("acceso") ||
    lower.includes("acceder")
  ) {
    return "necesito acceso a salesforce";
  }
  if (
    lower.includes("reclamo") ||
    lower.includes("queja") ||
    lower.includes("enojado") ||
    lower.includes("cliente enojado") ||
    lower.includes("rechazo")
  ) {
    return "cliente enojado por rechazo";
  }
  if (
    lower.includes("alta") ||
    lower.includes("usuario") ||
    lower.includes("sla") ||
    lower.includes("tarda")
  ) {
    return "cuanto tarda el alta de usuario";
  }
  if (
    lower.includes("paternidad") ||
    lower.includes("licencia") ||
    lower.includes("rrhh") ||
    lower.includes("hr")
  ) {
    return "politica de licencia por paternidad";
  }
  return null;
}

// ─── Suggestion chips (empty state del /ask) ────────────────────────

export const SUGGESTED_QUERIES = [
  "¿Cómo funciona The Company Brain?",
  "¿Dónde subo el ticket para blanquear mi contraseña?",
  "¿Qué portal uso para dar de alta a un colaborador externo?",
  "Necesito acceso a Salesforce, ¿a quién le pido?",
  "¿Cuánto tarda en la práctica el alta de un usuario?",
];

// ─── Métricas del Skills File para /admin overview ──────────────────

export const COVERAGE = {
  total_employees: PEOPLE.length,
  interviewed: PEOPLE.filter((p) => p.interviewed).length,
  pct_interviewed: Math.round((PEOPLE.filter((p) => p.interviewed).length / PEOPLE.length) * 100),
  total_entities: 247,
  entities_by_type: {
    people: 12,
    tools: 23,
    processes: 41,
    glossary: 18,
    informal_rules: 34,
    relationships: 119,
  },
  queries_this_week: 38,
  queries_resolved_pct: 92,
};

// Top queries de la semana (mock)
export const RECENT_QUERIES = [
  { query: "I need access to Salesforce", count: 8, type: "access_path", resolved: true },
  { query: "Who approves credit exceptions?", count: 5, type: "person_lookup", resolved: true },
  { query: "What is the Blur Score?", count: 4, type: "definition", resolved: true },
  { query: "How do I escalate a complaint to Legal?", count: 3, type: "routing", resolved: true },
  { query: "What's the paternity leave policy?", count: 3, type: "unknown", resolved: false },
];

// Entrevistas mock para /admin/interviews
export const INTERVIEWS = [
  { person_id: "ceo_01", duration: "08:42", entities_extracted: 24, informal_rules: 5, status: "completed" as const },
  { person_id: "cto_01", duration: "07:15", entities_extracted: 31, informal_rules: 9, status: "completed" as const },
  { person_id: "vp_risk", duration: "09:03", entities_extracted: 28, informal_rules: 7, status: "completed" as const },
  { person_id: "gte_credit", duration: "07:12", entities_extracted: 31, informal_rules: 8, status: "completed" as const },
  { person_id: "gte_ops", duration: "06:48", entities_extracted: 22, informal_rules: 4, status: "completed" as const },
  { person_id: "analyst_sr", duration: "06:30", entities_extracted: 18, informal_rules: 3, status: "completed" as const },
  { person_id: "account_off", duration: "07:55", entities_extracted: 26, informal_rules: 6, status: "completed" as const },
  { person_id: "backoffice", duration: "05:42", entities_extracted: 14, informal_rules: 2, status: "completed" as const },
  { person_id: "sysadmin", duration: "08:20", entities_extracted: 33, informal_rules: 7, status: "completed" as const },
  { person_id: "cfo_01", duration: "—", entities_extracted: 0, informal_rules: 0, status: "scheduled" as const },
  { person_id: "analyst_jr", duration: "—", entities_extracted: 0, informal_rules: 0, status: "scheduled" as const },
  { person_id: "hr_lead", duration: "—", entities_extracted: 0, informal_rules: 0, status: "pending" as const },
];
