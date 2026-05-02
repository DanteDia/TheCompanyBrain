// Bridge between the mock-driven UI and the real backend.
//
// Behavior:
//   - If `?demo=1` is in the URL OR the backend is unreachable, return a
//     mock answer from `mock-data.ts`.
//   - Otherwise hit `/api/ask` on the real backend (Render) and convert the
//     Pydantic Answer into the UI's QAAnswer shape.
//
// The component never sees the difference — it always gets a QAAnswer.

import { ask as askBackend, ApiError } from "./api-backend";
import type { Answer as BackendAnswer } from "./types-backend";
import { DEMO_QUERIES, SUGGESTED_QUERIES, matchDemoQuery } from "./mock-data";
import type { QAAnswer, AnswerType, ReferencedEntity, Citation } from "./types";

export type AskMode = "auto" | "demo" | "live";

export function getAskMode(): AskMode {
  if (typeof window === "undefined") return "auto";
  const p = new URLSearchParams(window.location.search);
  if (p.get("demo") === "1" || p.get("demo") === "true") return "demo";
  if (p.get("live") === "1" || p.get("live") === "true") return "live";
  return "auto";
}

/** Mock fallback — guaranteed answer based on the matcher. */
function mockAnswer(question: string): QAAnswer {
  const key = matchDemoQuery(question);
  if (key) return DEMO_QUERIES[key];
  return {
    answer:
      "No encontré información específica sobre eso en el Brain todavía. ¿Querés probar con una de las preguntas sugeridas?",
    answer_type: "unknown",
    entities_referenced: [],
    citations: [],
    confidence: 0.3,
    insufficient_information: true,
    follow_up_suggestions: SUGGESTED_QUERIES.slice(0, 2),
  };
}

/** Backend Answer → UI QAAnswer */
function backendToUi(b: BackendAnswer): QAAnswer {
  const answer_type: AnswerType = b.insufficient_information
    ? "unknown"
    : b.person_to_contact
      ? "person_lookup"
      : b.procedure
        ? "access_path"
        : "definition";

  const entities_referenced: ReferencedEntity[] = [];
  if (b.person_to_contact) {
    entities_referenced.push({
      type: "Person",
      id: b.person_to_contact.id,
      name: b.person_to_contact.name,
    });
  }

  const citations: Citation[] = (b.citations || []).map((c) => ({
    text: c.quote,
    entity_type: c.entity_type,
    entity_id: c.entity_id,
    evidence: {
      source_type: (c.source_type as any) || "interview",
      source_id: c.source_id,
      speaker: c.speaker,
      quote: c.quote,
    },
  }));

  // Compose a richer "answer" string with procedure + sla appended (the UI
  // shows it as a single block).
  const parts: string[] = [b.summary || ""];
  if (b.procedure) parts.push(`\n\n**Cómo:** ${b.procedure}`);
  if (b.sla) parts.push(`\n\n**SLA:** ${b.sla}`);

  return {
    answer: parts.join(""),
    answer_type,
    entities_referenced,
    citations,
    follow_up_suggestions: (b.follow_ups || []).map((f) => f.text),
    confidence: b.insufficient_information ? 0.4 : 0.85,
    insufficient_information: !!b.insufficient_information,
    thinking_trace: b.thinking_trace || undefined,
  };
}

/**
 * Ask the Brain. Routes to backend or mock based on URL flag + reachability.
 * Always returns a QAAnswer; never throws.
 */
export async function askBrain(question: string, opts?: { user_email?: string }): Promise<{
  answer: QAAnswer;
  source: "live" | "mock";
}> {
  const mode = getAskMode();

  if (mode === "demo") {
    return { answer: mockAnswer(question), source: "mock" };
  }

  // mode === "auto" | "live" → try backend first
  try {
    const backendAnswer = await askBackend(question, opts);
    return { answer: backendToUi(backendAnswer), source: "live" };
  } catch (err) {
    // Auto mode falls back to mock silently. Live mode rethrows for visibility.
    if (mode === "live") {
      const status = err instanceof ApiError ? err.status : 0;
      throw new Error(`Backend unreachable (${status}). Add ?demo=1 to use mock data.`);
    }
    console.warn("[askBrain] backend failed, falling back to mock:", err);
    return { answer: mockAnswer(question), source: "mock" };
  }
}
