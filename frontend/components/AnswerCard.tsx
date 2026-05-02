"use client";

import { AlertCircle, Mail, Phone, ArrowRight, BadgeCheck } from "lucide-react";
import type { Answer, FollowUpSuggestion } from "@/lib/types";
import { ProvenanceTooltip } from "./ProvenanceTooltip";
import { ThinkingTrace } from "./ThinkingTrace";

interface Props {
  answer: Answer;
  onFollowUp?: (q: FollowUpSuggestion) => void;
}

export function AnswerCard({ answer, onFollowUp }: Props) {
  const insuf = answer.insufficient_information;
  const person = answer.person_to_contact || null;

  return (
    <article className="animate-fade-in space-y-4 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
      {/* Status pill */}
      <div className="flex items-center justify-between">
        <span
          className={
            insuf
              ? "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
              : "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200"
          }
        >
          {insuf ? (
            <>
              <AlertCircle className="h-3 w-3" />
              No tengo eso todavía
            </>
          ) : (
            <>
              <BadgeCheck className="h-3 w-3" />
              Respuesta directa
            </>
          )}
        </span>
        {answer.referenced_entity_ids.length > 0 && (
          <span className="text-xs text-ink-400">
            {answer.referenced_entity_ids.length} entidades del Brain
          </span>
        )}
      </div>

      {/* Summary */}
      <p className="text-lg leading-relaxed text-ink-900">{answer.summary}</p>

      {/* Person to contact */}
      {person && (
        <div className="rounded-lg bg-ink-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Contactar a
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-base font-semibold text-ink-900">{person.name}</h3>
            <span className="text-sm text-ink-600">
              {person.role}
              {person.area ? ` · ${person.area}` : ""}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink-700">
            {person.email && (
              <a
                href={`mailto:${person.email}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 ring-1 ring-inset ring-ink-200 hover:ring-accent"
              >
                <Mail className="h-3.5 w-3.5" />
                {person.email}
              </a>
            )}
            {person.phone && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 ring-1 ring-inset ring-ink-200">
                <Phone className="h-3.5 w-3.5" />
                {person.phone}
              </span>
            )}
          </div>
          {person.expertise_areas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.expertise_areas.slice(0, 5).map((e) => (
                <span
                  key={e}
                  className="rounded-full bg-white px-2 py-0.5 text-xs text-ink-600 ring-1 ring-inset ring-ink-200"
                >
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Procedure + SLA */}
      {(answer.procedure || answer.sla) && (
        <div className="space-y-2">
          {answer.procedure && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Cómo</div>
              <p className="mt-1 text-sm leading-relaxed text-ink-800">{answer.procedure}</p>
            </div>
          )}
          {answer.sla && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-ink-500">SLA esperado</div>
              <p className="mt-1 text-sm text-ink-800">{answer.sla}</p>
            </div>
          )}
        </div>
      )}

      {/* Citations */}
      <ProvenanceTooltip citations={answer.citations} />

      {/* Thinking trace */}
      <ThinkingTrace trace={answer.thinking_trace} />

      {/* Follow-ups */}
      {answer.follow_ups.length > 0 && (
        <div className="border-t border-ink-100 pt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-500">
            ¿Querés saber también...?
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {answer.follow_ups.map((fu, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(fu)}
                className="group inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-ink-700 ring-1 ring-inset ring-ink-200 transition-all hover:bg-accent hover:text-white hover:ring-accent"
              >
                {fu.text}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
