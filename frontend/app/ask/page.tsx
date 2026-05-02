"use client";

import { useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { ask, ApiError } from "@/lib/api";
import type { Answer, FollowUpSuggestion } from "@/lib/types";
import { AnswerCard } from "@/components/AnswerCard";

interface Turn {
  query: string;
  answer?: Answer;
  loading: boolean;
  error?: string;
}

const SUGGESTED = [
  "Necesito acceso a Salesforce, ¿a quién le pido?",
  "¿Quién maneja los reclamos de clientes mayoristas?",
  "¿Cuánto tarda realmente un alta de usuario en sistemas?",
  "¿Cuál es la política de licencias por paternidad?",
];

export default function AskPage() {
  const [query, setQuery] = useState("");
  const [thread, setThread] = useState<Turn[]>([]);

  async function submit(q: string) {
    const text = q.trim();
    if (!text) return;
    setQuery("");
    setThread((t) => [...t, { query: text, loading: true }]);
    try {
      const answer = await ask(text);
      setThread((t) =>
        t.map((turn, i) =>
          i === t.length - 1 ? { ...turn, answer, loading: false } : turn
        )
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : err instanceof Error
            ? err.message
            : "Error desconocido";
      setThread((t) =>
        t.map((turn, i) =>
          i === t.length - 1 ? { ...turn, loading: false, error: msg } : turn
        )
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          Trojan Horse · onboarding
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Preguntale al Brain.
        </h1>
        <p className="text-ink-600">
          La respuesta sale de las entrevistas a los empleados — no de los docs.
          Si no lo sabe, te dice a quién preguntarle.
        </p>
      </header>

      {thread.length === 0 && (
        <section>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Probá con una de estas
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-lg border border-ink-200 bg-white px-4 py-3 text-left text-sm text-ink-800 transition-all hover:border-accent hover:shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        {thread.map((turn, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-prose-wide rounded-2xl rounded-tr-sm bg-ink-900 px-4 py-2 text-sm text-white">
                {turn.query}
              </div>
            </div>
            {turn.loading && (
              <div className="flex items-center gap-2 text-sm text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Pensando...
              </div>
            )}
            {turn.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {turn.error}
              </div>
            )}
            {turn.answer && (
              <AnswerCard
                answer={turn.answer}
                onFollowUp={(fu: FollowUpSuggestion) => submit(fu.text)}
              />
            )}
          </div>
        ))}
      </section>

      {/* Input — sticky to bottom on mobile, inline above on desktop */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        className="sticky bottom-4 mt-6"
      >
        <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2 shadow-sm focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué querés saber?"
            className="flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Preguntar
          </button>
        </div>
      </form>
    </div>
  );
}
