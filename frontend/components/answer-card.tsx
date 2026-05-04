"use client";

import { Check, AlertCircle, GitBranch, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Citations } from "@/components/citations";
import { PersonCard } from "@/components/person-card";
import { cn } from "@/lib/utils";
import type { QAAnswer } from "@/lib/types";

interface AnswerCardProps {
  answer: QAAnswer;
  isAdmin: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}

export function AnswerCard({ answer, isAdmin, onSuggestionClick }: AnswerCardProps) {
  const isGap = answer.insufficient_information;
  const isMultiSource = !!answer.conflicting_sources?.length;
  const personIds = answer.entities_referenced
    .filter((e) => e.type === "Person")
    .map((e) => e.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "rounded-lg border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        isGap ? "border-stone-300 bg-stone-50/30" : "border-stone-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
          {isGap ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-stone-400" />
              <span className="italic">Conocimiento incompleto</span>
            </>
          ) : isMultiSource ? (
            <>
              <GitBranch className="h-3.5 w-3.5 text-yellow-700" />
              <span>Fuentes en conflicto</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-green-700" strokeWidth={2.5} />
              <span>Respuesta</span>
            </>
          )}
        </div>
        <span className="text-xs text-stone-400 font-mono">
          confianza {(answer.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div className="text-base leading-relaxed text-stone-800 whitespace-pre-wrap">
          {renderAnswerText(answer.answer)}
        </div>

        {/* Multi-source conflicts */}
        {isMultiSource && (
          <div className="mt-4 space-y-2">
            {answer.conflicting_sources!.map((src, i) => (
              <div
                key={i}
                className="rounded-md border-l-2 border-yellow-600 bg-yellow-50/50 px-3 py-2"
              >
                <div className="text-xs font-medium text-yellow-900 mb-1">
                  {src.source}
                </div>
                <div className="text-sm text-stone-700 italic">"{src.claim}"</div>
              </div>
            ))}
          </div>
        )}

        {/* Person cards */}
        {personIds.length > 0 && (
          <div className="mt-4 space-y-2">
            {personIds.map((id) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <PersonCard id={id} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Other entities (Tools, Processes) as chips */}
        {answer.entities_referenced.filter((e) => e.type !== "Person").length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {answer.entities_referenced
              .filter((e) => e.type !== "Person")
              .map((e) => (
                <Badge
                  key={e.id}
                  variant={
                    e.type === "Tool"
                      ? "info"
                      : e.type === "Process"
                      ? "default"
                      : "accent"
                  }
                >
                  {e.name}
                </Badge>
              ))}
          </div>
        )}

        {/* Citations (admin only) */}
        <Citations citations={answer.citations} isAdmin={isAdmin} />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/30 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>Did this help?</span>
            <button className="hover:text-green-700 transition-colors">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button className="hover:text-stone-700 transition-colors">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {answer.follow_up_suggestions && answer.follow_up_suggestions.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5">
              You can also ask
            </div>
            <div className="flex flex-wrap gap-1.5">
              {answer.follow_up_suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onSuggestionClick?.(s)}
                  className="text-xs text-stone-700 bg-white border border-stone-200 hover:border-stone-400 hover:bg-stone-50 px-2.5 py-1 rounded-md transition-colors text-left"
                >
                  → {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function renderAnswerText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} className="font-medium text-stone-900 dotted-underline">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
