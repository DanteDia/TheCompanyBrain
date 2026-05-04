// Lightweight client-side classifier: maps a free-form question like
// "donde subo el pedido de blanqueo de password?" → the right Jira Service
// Desk portal. Runs BEFORE the FAQ matcher so onboarding-shaped questions
// never burn LLM tokens.

import type { QAAnswer } from "./types";
import { BLUR_PORTALS, PORTALS_LANDING, type Portal } from "./portals-data";

const STRIP_DIACRITICS = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const NORMALIZE = (s: string) =>
  STRIP_DIACRITICS(s.toLowerCase())
    .replace(/[¿?¡!.,;:()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Question-shape detectors — at least one must hit for the router to fire.
// Tuned for Argentine Spanish ("donde subo", "que portal uso", "a donde
// reporto", etc). Intentionally permissive — false positives just mean the
// LLM gets called next.
const PORTAL_INTENT_PATTERNS = [
  /\bportal\b/,
  /\bdonde\s+(subo|cargo|reporto|gestiono|hago|pido|solicito)\b/,
  /\ba\s+donde\s+(subo|cargo|reporto|pido|solicito)\b/,
  /\bcomo\s+(pido|solicito|cargo|gestiono|reporto|hago)\b/,
  /\bque\s+(portal|formulario|ticket)\b/,
  /\bjira\b/,
  /\bservicedesk\b/,
  /\bservice\s*desk\b/,
  /\bmesa\s+de\s+ayuda\b/,
  /\bblanqueo\b/,
  /\balta\s+(de\s+)?(usuario|colaborador|empleado)\b/,
  /\bbaja\s+(de\s+)?(usuario|colaborador|empleado)\b/,
  /\babrir\s+(un\s+)?ticket\b/,
];

function looksLikePortalQuestion(q: string): boolean {
  const n = NORMALIZE(q);
  return PORTAL_INTENT_PATTERNS.some((p) => p.test(n));
}

function scorePortal(question: string, p: Portal): number {
  const n = NORMALIZE(question);
  let score = 0;
  for (const k of p.keywords) {
    const nk = NORMALIZE(k);
    if (!nk) continue;
    if (n.includes(nk)) {
      // Reward longer keyword matches more
      score += nk.split(/\s+/).length * 2;
    }
  }
  // Bonus if the portal name itself appears
  if (n.includes(NORMALIZE(p.name))) score += 5;
  return score;
}

function rankPortals(question: string): Array<{ portal: Portal; score: number }> {
  return BLUR_PORTALS.map((p) => ({ portal: p, score: scorePortal(question, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function buildAnswer(
  question: string,
  matches: Array<{ portal: Portal; score: number }>,
): QAAnswer {
  if (matches.length === 0) {
    // Asked about portals but we couldn't pin one — fall back to the index
    return {
      answer:
        `No te puedo precisar el portal exacto sin más contexto, pero todos los portales del banco viven acá:\n\n` +
        `→ [Portal de Autogestión Blur](${PORTALS_LANDING})\n\n` +
        `Si me decís qué necesitás (ej: *"alta de usuario externo"*, *"anticipo de sueldo"*, *"problema con un sistema"*) te apunto al portal correcto.`,
      answer_type: "routing",
      entities_referenced: [
        {
          type: "Tool",
          id: "tool-jsd-landing",
          name: "Portal de Autogestión Blur (Jira Service Desk)",
        },
      ],
      citations: [],
      confidence: 0.55,
      insufficient_information: true,
      follow_up_suggestions: [
        "¿Cómo pido alta de un colaborador externo?",
        "¿Dónde subo un blanqueo de contraseña?",
        "¿Qué portal uso para devolver una transferencia inmediata?",
      ],
    };
  }

  const top = matches[0].portal;
  const others = matches.slice(1, 4).map((m) => m.portal);

  const lines: string[] = [];
  lines.push(`Para eso usá el portal **${top.name}**.`);
  lines.push("");
  lines.push(`→ [Abrir el portal en Jira Service Desk](${top.url})`);
  lines.push("");
  lines.push(`**Quién lo gestiona:** ${top.owner}`);
  if (top.requestTypes.length > 0) {
    lines.push("");
    lines.push("**Tipos de solicitud disponibles:**");
    for (const t of top.requestTypes.slice(0, 8)) {
      lines.push(`- ${t}`);
    }
    if (top.requestTypes.length > 8) {
      lines.push(`- … (${top.requestTypes.length - 8} más en el portal)`);
    }
  }

  if (others.length > 0) {
    lines.push("");
    lines.push("**Si lo tuyo era otra cosa, también podría ser:**");
    for (const p of others) {
      lines.push(`- [${p.name}](${p.url}) — ${p.owner}`);
    }
  }

  lines.push("");
  lines.push(
    `_Catálogo completo de los 25 portales: [Portal de Autogestión Blur](${PORTALS_LANDING})_`,
  );

  const entities = [
    {
      type: "Tool" as const,
      id: `tool-jsd-${top.id}`,
      name: top.name,
    },
    ...others.map((p) => ({
      type: "Tool" as const,
      id: `tool-jsd-${p.id}`,
      name: p.name,
    })),
  ];

  // Confidence scales with score gap between top match and runner-up.
  const top1 = matches[0].score;
  const top2 = matches[1]?.score ?? 0;
  const confidence = Math.min(0.97, 0.6 + (top1 - top2) * 0.05);

  return {
    answer: lines.join("\n"),
    answer_type: "routing",
    entities_referenced: entities,
    citations: [
      {
        text: `Portal ${top.name} — Jira Service Desk de Blur`,
        entity_type: "Tool",
        entity_id: `tool-jsd-${top.id}`,
        evidence: {
          source_type: "document",
          source_id: `jsd-portal-${top.id}`,
          quote: `Portal '${top.name}' en https://bindtm.atlassian.net/servicedesk/customer/portals — gestionado por ${top.owner}.`,
        },
      },
    ],
    confidence,
    insufficient_information: false,
    follow_up_suggestions: [
      "¿Quién es el dueño de este portal?",
      "¿Cuánto suele tardar la respuesta?",
      "Mostrame todos los portales disponibles",
    ],
  };
}

/** Returns a portal-routing QAAnswer if the question looks like one of those
 *  "where do I file this?" questions, or null otherwise. */
export function matchPortalIntent(question: string): QAAnswer | null {
  if (!question || question.length < 4) return null;
  if (!looksLikePortalQuestion(question)) return null;
  const matches = rankPortals(question);
  return buildAnswer(question, matches);
}
