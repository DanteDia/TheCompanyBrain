"use client";

/**
 * Admin "Company Brain" tab — internal chat with the org's brain.
 * Reuses the same ask-router + components as /ask, but lives inside the
 * admin layout so the operator can quickly query the brain without
 * leaving the dashboard. Runs against the same backend org by default.
 */

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { AnswerCard } from "@/components/answer-card";
import { ThinkingTrace } from "@/components/thinking-trace";
import { Composer } from "@/components/composer";
import { Avatar } from "@/components/ui/avatar";
import { getSuggestedQueries, ORGANIZATION } from "@/lib/mock-data";
import { useLocale } from "@/components/locale-toggle";
import { t } from "@/lib/i18n";
import { askBrain } from "@/lib/ask-router";
import type { ChatTurn, QAAnswer } from "@/lib/types";

export default function AdminChatPage() {
  const [locale] = useLocale();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestions = getSuggestedQueries(locale);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, thinking]);

  async function handleQuestion(question: string) {
    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: Date.now(),
    };
    setTurns((t) => [...t, userTurn]);
    setThinking(true);

    let answer: QAAnswer;
    try {
      const result = await askBrain(question);
      answer = result.answer;
    } catch (err) {
      answer = {
        answer:
          err instanceof Error
            ? err.message
            : "Error reaching the Brain.",
        answer_type: "unknown",
        entities_referenced: [],
        citations: [],
        confidence: 0.2,
        insufficient_information: true,
        follow_up_suggestions: suggestions.slice(0, 2),
      };
    }

    const asstTurn: ChatTurn = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
      answer,
      timestamp: Date.now(),
    };
    setThinking(false);
    setTurns((t) => [...t, asstTurn]);
  }

  return (
    <div className="flex h-dvh flex-col bg-stone-50">
      {/* Sub-header for the admin chat */}
      <div className="border-b border-stone-200 bg-white px-8 py-4">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          {locale === "es" ? "Admin · Company Brain" : "Admin · Company Brain"}
        </div>
        <h1 className="text-2xl tracking-tight font-medium text-stone-900 mt-0.5">
          {locale === "es" ? "Pregunta al Brain" : "Ask the Brain"}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {locale === "es"
            ? <>Chat interno — consultá tu propio grafo de conocimiento. Mismo motor que la interfaz <code>/ask</code> para empleados, scoped a <strong>{ORGANIZATION.name}</strong>.</>
            : <>Internal chat — query your own knowledge graph. Same engine as the employee <code>/ask</code> interface, scoped to <strong>{ORGANIZATION.name}</strong>.</>}
        </p>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 md:px-10 py-8">
          {turns.length === 0 ? (
            <EmptyState onSelect={handleQuestion} locale={locale} suggestions={suggestions} />
          ) : (
            <div className="space-y-6">
              {turns.map((turn) =>
                turn.role === "user" ? (
                  <UserMessage key={turn.id} content={turn.content} />
                ) : (
                  <AssistantMessage
                    key={turn.id}
                    answer={turn.answer!}
                    onSuggestionClick={handleQuestion}
                  />
                )
              )}
              {thinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-stone-200 bg-white px-5 py-4"
                >
                  <ThinkingTrace active />
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 md:px-10 py-4">
          <Composer
            onSubmit={handleQuestion}
            disabled={thinking}
            placeholder={locale === "es" ? "Preguntale al Brain sobre tu empresa…" : "Ask the Brain about your company…"}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onSelect,
  locale,
  suggestions,
}: {
  onSelect: (q: string) => void;
  locale: "en" | "es";
  suggestions: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center pt-4 md:pt-12"
    >
      <h2 className="text-3xl tracking-tight font-medium text-stone-900">
        {locale === "es" ? "¿Qué querés saber?" : "What do you want to know?"}
      </h2>
      <p className="mt-3 text-stone-600 max-w-md mx-auto">
        {locale === "es"
          ? "Consultá el conocimiento operativo de tu empresa — personas, sistemas, accesos, procesos, reglas no escritas."
          : "Query your company's operational knowledge — people, systems, access paths, processes, unwritten rules."}
      </p>

      <div className="mt-10 grid gap-2 max-w-xl mx-auto text-left">
        <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1 px-1">
          {locale === "es" ? "Probá con esto" : "Try these"}
        </div>
        {suggestions.map((q, i) => (
          <motion.button
            key={q}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => onSelect(q)}
            className="group flex items-center justify-between w-full text-left rounded-lg border border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm transition-all px-4 py-3"
          >
            <span className="text-sm text-stone-700 group-hover:text-stone-900">
              → {q}
            </span>
            <span className="text-xs text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
              ⏎
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 justify-end"
    >
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-stone-900 px-4 py-2.5 text-stone-50">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
      <Avatar name="Admin" size="sm" />
    </motion.div>
  );
}

function AssistantMessage({
  answer,
  onSuggestionClick,
}: {
  answer: QAAnswer;
  onSuggestionClick: (q: string) => void;
}) {
  return (
    <div>
      <ThinkingTrace />
      <AnswerCard
        answer={answer}
        isAdmin={true}
        onSuggestionClick={onSuggestionClick}
      />
    </div>
  );
}
