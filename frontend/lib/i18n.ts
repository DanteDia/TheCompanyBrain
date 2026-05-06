// Sistema de i18n simple — sin dependencia externa
// Para escalar después: cambiar a next-intl o react-i18next

export type Locale = "es" | "en";

export const DEFAULT_LOCALE: Locale = "en";

type Dict = Record<string, { es: string; en: string }>;

export const STRINGS: Dict = {
  // Navegación
  "nav.product": { es: "Producto", en: "Product" },
  "nav.how_it_works": { es: "Cómo funciona", en: "How it works" },
  "nav.integrations": { es: "Integraciones", en: "Integrations" },
  "nav.pricing": { es: "Pricing", en: "Pricing" },
  "nav.signin": { es: "Iniciar sesión", en: "Sign in" },
  "nav.demo": { es: "Probar la demo", en: "Try the demo" },
  "nav.book_demo": { es: "Agendar demo", en: "Book a demo" },
  "nav.demo_call": { es: "Demo call", en: "Demo call" },
  "nav.ask_brain": { es: "Hablar con la Brain", en: "Ask the Brain" },

  // /try — public voice-demo lobby
  "try.eyebrow": { es: "Demo en vivo", en: "Live demo" },
  "try.title": {
    es: "Hablá 3 minutos con la Brain.",
    en: "Have a 3-minute conversation with the Brain.",
  },
  "try.subtitle": {
    es: "Esta es la misma entrevista que usamos para entender cómo trabaja un empleado real. Elegí un rol en Blur Bank y vas a ver cómo el agente adapta sus preguntas en tiempo real.",
    en: "This is the same interview we use to understand how a real employee works. Pick a role at Blur Bank and you'll see the agent adapt its questions in real time.",
  },
  "try.step": { es: "Paso", en: "Step" },
  "try.step1_title": {
    es: "¿En qué idioma querés que el agente te hable?",
    en: "Which language should the agent speak?",
  },
  "try.step2_title": {
    es: "Elegí un rol al que querés ponerte en los zapatos.",
    en: "Pick a role you'd like to step into.",
  },
  "try.step2_subtitle": {
    es: "El agente va a saber tu rol y área antes de llamarte. Vas a notar cómo cambian las preguntas según a quién esté entrevistando.",
    en: "The agent will know your role and area before the call starts. You'll notice the questions change based on who it's interviewing.",
  },
  "try.cta": { es: "Empezar la llamada", en: "Start the call" },
  "try.starting": { es: "Conectando…", en: "Connecting…" },
  "try.disclaimer": {
    es: "La llamada dura un máximo de 5 minutos y nada se persiste — esto es solo una prueba. Vas a necesitar permitir el micrófono.",
    en: "The call is capped at 5 minutes and nothing is persisted — this is just a test drive. You'll need to allow microphone access.",
  },
  "try.back_to_landing": { es: "Volver", en: "Back" },

  // /interview — live call screen UI
  "interview.status.ready": { es: "Cuando quieras", en: "Ready when you are" },
  "interview.status.starting": { es: "Conectando…", en: "Connecting…" },
  "interview.status.speaking": { es: "El agente está hablando", en: "The agent is talking" },
  "interview.status.listening": { es: "Te escucho — adelante", en: "I'm listening — go ahead" },
  "interview.status.live": { es: "En vivo", en: "Live" },
  "interview.status.ended": { es: "Entrevista terminada", en: "Interview finished" },
  "interview.status.error": { es: "Algo salió mal", en: "Something went wrong" },
  "interview.you_label": { es: "vos: ", en: "you: " },
  "interview.end_button": { es: "Terminar entrevista", en: "End interview" },
  "interview.done_title": { es: "Listo — ¡gracias!", en: "Done — thanks!" },
  "interview.done_subtitle_pre": {
    es: "El Brain está procesando lo que conversamos. En segundos vas a ver tu información integrada en ",
    en: "The Brain is processing what we talked about. In seconds you'll see your information integrated into ",
  },
  "interview.done_subtitle_link": {
    es: "el grafo de la empresa",
    en: "the company graph",
  },
  "interview.duration_label": { es: "duración:", en: "duration:" },
  "interview.error_title": { es: "No pudimos iniciar la entrevista", en: "We couldn't start the interview" },
  "interview.error_unknown": { es: "Error desconocido", en: "Unknown error" },
  "interview.retry": { es: "Reintentar", en: "Retry" },
  "interview.error_contact": {
    es: "Si el problema persiste, escribinos a tomas@thecompanybrain.xyz",
    en: "If the problem persists, write to tomas@thecompanybrain.xyz",
  },
  "interview.eyebrow": { es: "Entrevista · Company Brain", en: "Interview · Company Brain" },
  "interview.ready_title": {
    es: "Te voy a hacer unas preguntas cortas.",
    en: "I'll ask you a few short questions.",
  },
  "interview.ready_subtitle": {
    es: "~7 minutos. Hablá natural, como con un colega. Tu input es lo que arma el sistema interno de tu empresa.",
    en: "~7 minutes. Speak naturally, like with a colleague. Your input is what builds your company's internal system.",
  },
  "interview.start_button": { es: "Iniciar entrevista", en: "Start interview" },
  "interview.mic_hint": {
    es: "Vas a darle permiso al micrófono cuando el navegador te lo pida.",
    en: "You'll grant mic permission when your browser asks.",
  },
  "interview.demo_badge": {
    es: "Demo — máx 5 min, no se guarda nada",
    en: "Demo mode — 5 min max, nothing is saved",
  },
  "interview.mock_badge": {
    es: "Modo mock — sólo UI, sin llamada real",
    en: "Mock mode — UI only, no live call",
  },

  // /interview demo end-screen — animation showing the contribution to the brain
  "demo_end.eyebrow": { es: "Tu aporte", en: "Your contribution" },
  "demo_end.title": {
    es: "Esto es lo que el Brain aprendió de vos.",
    en: "Here's what the Brain just learned from you.",
  },
  "demo_end.subtitle": {
    es: "Cada pieza que mencionaste se mueve hacia el grafo de la empresa: herramientas, personas, procesos y reglas no escritas. Así crece el Brain con cada entrevista.",
    en: "Every piece you mentioned moves into the company graph: tools, people, processes, and unwritten rules. This is how the Brain grows with each interview.",
  },
  "demo_end.note": {
    es: "En la demo no se persiste nada. En producción, esto se integra al Skills File de tu empresa y queda disponible vía Slack, web o WhatsApp.",
    en: "In the demo nothing is saved. In production this gets integrated into your company's Skills File and stays queryable via Slack, web, or WhatsApp.",
  },
  "demo_end.cta_schedule": { es: "Agendar demo guiada", en: "Schedule guided demo" },
  "demo_end.cta_try_another": { es: "Probar otro rol", en: "Try another role" },
  "demo_end.cta_review": { es: "Revisar lo capturado", en: "Review what was captured" },
  "demo_end.cta_review_loading": { es: "Procesando…", en: "Processing…" },
  "demo_end.review_badge_real": { es: "Real", en: "Real" },
  "demo_end.review_badge_preview": { es: "Vista previa", en: "Preview" },
  "demo_end.review_eyebrow": { es: "Revisión", en: "Review" },
  "demo_end.review_title": {
    es: "Confirmá lo que el agente entendió.",
    en: "Confirm what the agent understood.",
  },
  "demo_end.review_intro": {
    es: "Los nombres de personas y herramientas son los datos donde el agente más se equivoca. Tomate 30 segundos para confirmar o marcar lo que esté mal.",
    en: "Names of people and tools are where the agent makes the most mistakes. Take 30 seconds to confirm or flag anything that's off.",
  },
  "demo_end.review_footer": {
    es: "En producción, las correcciones se sincronizan al grafo y reentrenan el extractor para esa empresa. Acá solo es visual.",
    en: "In production, corrections sync back to the graph and retrain the extractor for that company. Here it's purely visual.",
  },

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
  "hero.cta_voice": { es: "Demo de voz", en: "Voice demo" },
  "hero.cta_voice_sub": { es: "Hablá con el agente", en: "Talk to the agent" },
  "hero.cta_chat": { es: "Demo de chat", en: "Chat demo" },
  "hero.cta_chat_sub": { es: "Preguntale al brain", en: "Ask the brain" },
  "hero.cta_schedule": { es: "Agendar demo guiada", en: "Schedule guided demo" },
  // Legacy keys preserved for any callers still using them — point to the voice demo by default.
  "hero.cta_primary": { es: "Demo de voz", en: "Voice demo" },
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
    es: "Preguntame cualquier cosa sobre cómo funciona Blur Bank.",
    en: "Ask me anything about how Blur Bank works.",
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
