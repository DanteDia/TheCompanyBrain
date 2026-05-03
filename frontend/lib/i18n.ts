// Sistema de i18n simple — sin dependencia externa
// Para escalar después: cambiar a next-intl o react-i18next

export type Locale = "es" | "en";

export const DEFAULT_LOCALE: Locale = "es";

type Dict = Record<string, { es: string; en: string }>;

export const STRINGS: Dict = {
  // Navegación
  "nav.product": { es: "Producto", en: "Product" },
  "nav.how_it_works": { es: "Cómo funciona", en: "How it works" },
  "nav.integrations": { es: "Integraciones", en: "Integrations" },
  "nav.pricing": { es: "Pricing", en: "Pricing" },
  "nav.signin": { es: "Iniciar sesión", en: "Sign in" },
  "nav.demo": { es: "Probar la demo", en: "Try the demo" },

  // Hero
  "hero.badge": {
    es: "Diseñado para banca regulada en LATAM",
    en: "Built for regulated banking in LATAM",
  },
  "hero.title": {
    es: "El 80% de cómo opera tu banco no está documentado.",
    en: "80% of how your bank actually works isn't documented.",
  },
  "hero.subtitle": {
    es: "Confluence indexa lo que escribiste. Glean busca en Slack. Pero las reglas no escritas, los flujos reales, quién aprueba qué — eso vive en cabezas. Entrevistamos a tu equipo con un agente de voz y bajamos ese conocimiento tácito a un sistema auditable y consultable.",
    en: "Confluence indexes what you wrote. Glean searches Slack. But unwritten rules, real workflows, who approves what — that lives in people's heads. We interview your team with a voice agent and bring that tacit knowledge into an auditable, queryable system.",
  },
  "hero.cta_primary": { es: "Ver el producto en vivo", en: "See it live" },
  "hero.cta_secondary": { es: "Agendar demo guiada", en: "Schedule guided demo" },

  // Sección problema
  "problem.eyebrow": { es: "El problema", en: "The problem" },
  "problem.title": {
    es: "El 80% de la información no está documentada.",
    en: "80% of your bank's knowledge isn't documented.",
  },
  "problem.subtitle1": {
    es: "Vive en la mente de tu equipo — no en Confluence, no en Slack, no en ningún manual.",
    en: "It lives in your team's heads — not in Confluence, not in Slack, not in any manual.",
  },
  "problem.subtitle2": {
    es: "Combiná el conocimiento de tu equipo con la data de tus herramientas.",
    en: "Combine your team's knowledge with the data from your tools.",
  },
  "problem.before_label": { es: "Hoy", en: "Today" },
  "problem.after_label": { es: "Con Company Brain", en: "With Company Brain" },
  "problem.before_channel": { es: "#general · Slack", en: "#general · Slack" },
  "problem.before_lost": { es: "1 día perdido en pings", en: "1 day lost in pings" },
  "problem.after_resolved": { es: "Resuelto en 5 segundos", en: "Resolved in 5 seconds" },
  "problem.after_thinking": { es: "Pensando…", en: "Thinking…" },
  "problem.after_answer_label": { es: "Respuesta", en: "Answer" },

  // Cómo funciona
  "how.title": { es: "Cómo funciona", en: "How it works" },
  "how.step1_title": { es: "Subimos tu organigrama", en: "Upload your org chart" },
  "how.step1_desc": {
    es: "Un CSV con nombres, roles y reportes. Resto lo descubrimos nosotros.",
    en: "A CSV with names, roles and reports. We discover the rest.",
  },
  "how.step2_title": {
    es: "Entrevistamos a cada empleado por 7 minutos",
    en: "We interview each employee for 7 minutes",
  },
  "how.step2_desc": {
    es: "Un agente de voz Claude-native llama a cada persona. 13 preguntas. Cero fricción.",
    en: "A Claude-native voice agent calls each person. 13 questions. Zero friction.",
  },
  "how.step3_title": {
    es: "Cualquier empleado pregunta lo que necesita",
    en: "Any employee asks whatever they need",
  },
  "how.step3_desc": {
    es: "Web, Slack, Google Chat, WhatsApp. La respuesta llega con persona, contacto y citas.",
    en: "Web, Slack, Google Chat, WhatsApp. Answer comes with person, contact, and citations.",
  },

  // Lo que captura
  "captures.eyebrow": { es: "El producto", en: "The product" },
  "captures.title": {
    es: "Un grafo del conocimiento operativo de tu banco.",
    en: "A graph of your bank's operational knowledge.",
  },
  "captures.subtitle": {
    es: "Personas, sistemas, procesos, vías de acceso, glosario y reglas no escritas — todo conectado, queryable y auditado por entidad.",
    en: "People, systems, processes, access paths, glossary and unwritten rules — all connected, queryable and audited by entity.",
  },
  "captures.people": { es: "Personas y roles", en: "People and roles" },
  "captures.people_desc": {
    es: "Quién hace qué, quién reporta a quién, quién sabe de qué.",
    en: "Who does what, who reports to whom, who knows what.",
  },
  "captures.tools": { es: "Sistemas y dueños", en: "Tools and owners" },
  "captures.tools_desc": {
    es: "Qué sistemas se usan en cada área y quién es el admin.",
    en: "What systems are used in each area and who admins them.",
  },
  "captures.access": { es: "Vías de acceso", en: "Access paths" },
  "captures.access_desc": {
    es: "A quién pedirle acceso a cada cosa, qué requiere, SLA típico.",
    en: "Who to request access from, what's required, typical SLA.",
  },
  "captures.tribal": { es: "Reglas no escritas", en: "Tribal knowledge" },
  "captures.tribal_desc": {
    es: "El conocimiento que solo viven en cabezas. Acá lo capturamos.",
    en: "Knowledge that only lives in heads. We capture it here.",
  },
  "captures.processes": { es: "Procesos y dueños", en: "Processes and owners" },
  "captures.processes_desc": {
    es: "Workflows operativos con su responsable y participantes.",
    en: "Operating workflows with their owner and participants.",
  },
  "captures.glossary": { es: "Glosario interno", en: "Internal glossary" },
  "captures.glossary_desc": {
    es: "Términos, siglas, productos. Lo que un empleado nuevo no entiende.",
    en: "Terms, acronyms, products. What a new hire doesn't get.",
  },

  // Integraciones
  "integrations.eyebrow": { es: "Integraciones", en: "Integrations" },
  "integrations.title": { es: "Pregunta donde ya estás.", en: "Ask where you already are." },
  "integrations.subtitle": {
    es: "Slack, Google Workspace, Notion, Salesforce y más. El Brain conecta con tu ecosistema existente.",
    en: "Slack, Google Workspace, Notion, Salesforce and more. The Brain plugs into your existing ecosystem.",
  },
  "integrations.see_all": { es: "Ver todas las integraciones", en: "See all integrations" },
  "integrations.badge.active": { es: "Activo", en: "Active" },
  "integrations.badge.available": { es: "Disponible", en: "Available" },
  "integrations.badge.coming_soon": { es: "Pronto", en: "Soon" },
  "integrations.cta.configured": { es: "Configurado", en: "Configured" },
  "integrations.cta.connect": { es: "Conectar", en: "Connect" },
  "integrations.category.channel": { es: "Canal", en: "Channel" },
  "integrations.category.source": { es: "Fuente", en: "Source" },
  "integrations.category.identity": { es: "Identidad", en: "Identity" },

  // Seguridad
  "security.title": { es: "Diseñado para auditoría.", en: "Built for audit." },
  "security.subtitle": {
    es: "Pensamos en el CISO de tu banco antes que en el feature.",
    en: "We thought about your bank's CISO before the feature.",
  },
  "security.sso_title": { es: "SSO empresarial", en: "Enterprise SSO" },
  "security.sso_desc": {
    es: "Google Workspace, Microsoft 365 y Okta soportados.",
    en: "Google Workspace, Microsoft 365 and Okta supported.",
  },
  "security.audit_title": { es: "Audit log completo", en: "Full audit log" },
  "security.audit_desc": {
    es: "Cada query queda registrada con usuario, timestamp y entidades consultadas.",
    en: "Every query is logged with user, timestamp, and entities consulted.",
  },
  "security.permissions_title": {
    es: "Permission-aware",
    en: "Permission-aware",
  },
  "security.permissions_desc": {
    es: "Las respuestas respetan los permisos del empleado en sus sistemas fuente.",
    en: "Answers respect the employee's permissions in source systems.",
  },

  // CTA final
  "cta.title": {
    es: "Tu próximo empleado nuevo va a estar productivo en 1 semana.",
    en: "Your next new hire will be productive in 1 week.",
  },
  "cta.primary": { es: "Probar la demo", en: "Try the demo" },
  "cta.secondary": { es: "Agendar una llamada", en: "Schedule a call" },

  // Web app /ask
  "ask.greeting": {
    es: "Preguntame cualquier cosa sobre cómo funciona BIND Bank.",
    en: "Ask me anything about how BIND Bank works.",
  },
  "ask.try": { es: "Probá:", en: "Try:" },
  "ask.composer_placeholder": {
    es: "Preguntá lo que necesites…",
    en: "Ask what you need…",
  },
  "ask.send": { es: "Enviar", en: "Send" },
  "ask.thinking": { es: "Pensando…", en: "Thinking…" },
  "ask.answer": { es: "Respuesta", en: "Answer" },
  "ask.thinking_trace": { es: "Razonamiento", en: "Reasoning" },
  "ask.citations": { es: "Citas y fuentes", en: "Citations" },
  "ask.helpful": { es: "¿Te ayudó esta respuesta?", en: "Did this help?" },
  "ask.followups": {
    es: "Próximas preguntas que podrías querer hacer",
    en: "Next questions you might want to ask",
  },
  "ask.gap_label": {
    es: "No tengo eso en el Brain todavía",
    en: "I don't have that in the Brain yet",
  },
  "ask.conflict_label": {
    es: "Encontré información conflictiva",
    en: "I found conflicting information",
  },
  "ask.session_indicator": {
    es: "Sesión activa",
    en: "Active session",
  },

  // Footer
  "footer.tagline": {
    es: "El cerebro operativo de tu empresa.",
    en: "The operating brain of your company.",
  },
  "footer.privacy": { es: "Privacidad", en: "Privacy" },
  "footer.terms": { es: "Términos", en: "Terms" },
  "footer.about": { es: "Nosotros", en: "About" },
  "footer.contact": { es: "Contacto", en: "Contact" },
};

export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[locale] || entry.es;
}
