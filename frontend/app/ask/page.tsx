"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { UserSelector, useActiveUser } from "@/components/user-selector";
import { AnswerCard } from "@/components/answer-card";
import { ThinkingTrace } from "@/components/thinking-trace";
import { Composer } from "@/components/composer";
import { SUGGESTED_QUERIES, getSuggestedQueries, ORGANIZATION } from "@/lib/mock-data";
import { askBrain } from "@/lib/ask-router";
import { t } from "@/lib/i18n";
import type { ChatTurn, QAAnswer } from "@/lib/types";

const ADMIN_ROLES = ["CEO", "CTO", "VP de Riesgo", "CFO", "Líder de RRHH"];

export default function AskPage() {
  const [user, setUser] = useActiveUser();
  const [locale, setLocale] = useLocale();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = ADMIN_ROLES.some((r) => user.role.includes(r));

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

    // Real backend call (with mock fallback if backend unreachable, or if
    // the URL has ?demo=1). askBrain never throws in auto mode.
    let answer: QAAnswer;
    try {
      const result = await askBrain(question, { user_email: user.email });
      answer = result.answer;
    } catch (err) {
      // Live mode + backend down → surface the error
      answer = {
        answer:
          err instanceof Error
            ? err.message
            : "Error reaching the Brain. Try ?demo=1 to use mock data.",
        answer_type: "unknown",
        entities_referenced: [],
        citations: [],
        confidence: 0.2,
        insufficient_information: true,
        follow_up_suggestions: SUGGESTED_QUERIES.slice(0, 2),
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
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden sm:inline-block text-stone-300">/</span>
            <span className="hidden sm:inline-block text-sm text-stone-600 font-medium">
              {ORGANIZATION.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleToggle locale={locale} onChange={setLocale} />
            <UserSelector user={user} onChange={setUser} />
          </div>
        </div>
      </header>

      {/* Conversation area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
          {turns.length === 0 ? (
            <EmptyState
              userName={user.name.split(" ")[0]}
              orgName={ORGANIZATION.name}
              locale={locale}
              onSelect={handleQuestion}
            />
          ) : (
            <div className="space-y-6">
              {turns.map((turn) =>
                turn.role === "user" ? (
                  <UserMessage key={turn.id} content={turn.content} userName={user.name} />
                ) : (
                  <AssistantMessage
                    key={turn.id}
                    answer={turn.answer!}
                    isAdmin={isAdmin}
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
        <div className="mx-auto max-w-3xl px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <Composer
            onSubmit={handleQuestion}
            disabled={thinking}
            placeholder={t("ask.composer_placeholder", locale)}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  userName,
  orgName,
  locale,
  onSelect,
}: {
  userName: string;
  orgName: string;
  locale: "es" | "en";
  onSelect: (q: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center pt-4 md:pt-12"
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl tracking-tight font-medium text-stone-900">
        Hi {userName}.
      </h1>
      <p className="mt-3 text-stone-600 max-w-md mx-auto text-sm sm:text-base md:text-lg">
        {locale === "es"
          ? `Ask me anything about how ${orgName} works.`
          : `Ask me anything about how ${orgName} works.`}
      </p>

      <div className="mt-10 grid gap-2 max-w-xl mx-auto text-left">
        <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1 px-1">
          {locale === "es" ? "Probá con esto" : "Try these"}
        </div>
        {getSuggestedQueries(locale).map((q, i) => (
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

function UserMessage({ content, userName }: { content: string; userName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 justify-end"
    >
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-stone-900 px-4 py-2.5 text-stone-50">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
      <Avatar name={userName} size="sm" />
    </motion.div>
  );
}

function AssistantMessage({
  answer,
  isAdmin,
  onSuggestionClick,
}: {
  answer: QAAnswer;
  isAdmin: boolean;
  onSuggestionClick: (q: string) => void;
}) {
  return (
    <div>
      <ThinkingTrace />
      <AnswerCard
        answer={answer}
        isAdmin={isAdmin}
        onSuggestionClick={onSuggestionClick}
      />
    </div>
  );
}
