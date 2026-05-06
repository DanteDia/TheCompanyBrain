// ───────────────────────────────────────────────────────────────────
// Demo personas — used by /try (the public voice-demo lobby).
//
// Each persona maps to an employee_id that already exists in the
// `tcb_demo` (Blur Bank) skills file seed. When the visitor picks a
// persona, we redirect them to /interview/<employee_id>?demo=1&lang=<l>
// and the interview agent automatically tunes its questions to that
// role + area via Retell `retell_llm_dynamic_variables`.
// ───────────────────────────────────────────────────────────────────

export interface DemoPersona {
  /** Existing employee_id in the tcb_demo skills file. */
  employee_id: string;
  /** Display name shown in the persona card. */
  name: string;
  /** Role title — bilingual. */
  role: { en: string; es: string };
  /** Area / department — bilingual. */
  area: { en: string; es: string };
  /** One-liner shown under the role. Sets expectations for how the agent will adapt. */
  blurb: { en: string; es: string };
  /** Single-character avatar fallback. */
  initials: string;
  /** Tailwind color hint for the avatar tile. */
  accent: "amber" | "sky" | "rose" | "emerald" | "violet";
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    employee_id: "sysadmin",
    name: "Tomás Ledesma",
    role: { en: "Sysadmin / IT", es: "Sysadmin / IT" },
    area: { en: "Technology", es: "Tecnología" },
    blurb: {
      en: "Owns Salesforce, SharePoint, VPN and onboarding tooling. The agent will dig into access paths, ticketing flows, and runbooks no one wrote down.",
      es: "Maneja Salesforce, SharePoint, VPN y el tooling de onboarding. El agente va a indagar en accesos, flujos de tickets y los runbooks que nadie escribió.",
    },
    initials: "TL",
    accent: "sky",
  },
  {
    employee_id: "analyst_sr",
    name: "Martín Suárez",
    role: { en: "Senior Credit Analyst", es: "Analista de Créditos Senior" },
    area: { en: "Risk", es: "Riesgo" },
    blurb: {
      en: "Approves credit lines and exception cases. Expect questions about evaluation rules, when to escalate, and the unwritten thresholds policy docs don't capture.",
      es: "Aprueba líneas y casos de excepción. Esperá preguntas sobre reglas de evaluación, cuándo escalar y los umbrales no escritos que no están en políticas.",
    },
    initials: "MS",
    accent: "amber",
  },
  {
    employee_id: "account_off",
    name: "Roberto Pascual",
    role: { en: "Account Officer", es: "Oficial de Cuentas" },
    area: { en: "Operations", es: "Operaciones" },
    blurb: {
      en: "Front-line client work — complaints, in-person service, consumer defense filings. The agent surfaces the soft skills and edge cases junior staff need to learn.",
      es: "Trato directo con clientes — reclamos, atención presencial, defensa al consumidor. El agente saca afuera el know-how y los edge cases que los juniors necesitan aprender.",
    },
    initials: "RP",
    accent: "rose",
  },
  {
    employee_id: "hr_lead",
    name: "Valeria Ríos",
    role: { en: "HR Lead", es: "Líder de RRHH" },
    area: { en: "People", es: "Personas" },
    blurb: {
      en: "Runs onboarding, benefits, leaves, and culture. The agent shifts to people-ops territory: process owners, vendor relationships, the unwritten norms of the org.",
      es: "Coordina onboarding, beneficios, licencias y cultura. El agente se mueve a people-ops: dueños de procesos, vendors, normas tácitas de la organización.",
    },
    initials: "VR",
    accent: "emerald",
  },
  {
    employee_id: "gte_ops",
    name: "Diego Ramírez",
    role: { en: "Operations Manager", es: "Gerente de Operaciones" },
    area: { en: "Operations", es: "Operaciones" },
    blurb: {
      en: "Manages the operations org and SLAs. The agent goes managerial: how decisions get made, who owns what, where the bottlenecks really are.",
      es: "Maneja el área de operaciones y los SLAs. El agente cambia a registro de management: cómo se toman decisiones, quién es dueño de qué, dónde están los cuellos de botella reales.",
    },
    initials: "DR",
    accent: "violet",
  },
];

export function findDemoPersona(employee_id: string): DemoPersona | undefined {
  return DEMO_PERSONAS.find((p) => p.employee_id === employee_id);
}
