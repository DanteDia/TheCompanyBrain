"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type Turn = { who: string; side: "left" | "right"; text: { es: string; en: string } };

const BEFORE_TURNS: Turn[] = [
  {
    who: "Sofia",
    side: "left",
    text: {
      es: "Who reviews vendor contracts?",
      en: "Who reviews vendor contracts?",
    },
  },
  {
    who: "Diego",
    side: "right",
    text: {
      es: "Ugh, not me. Try Ana.",
      en: "Not me. Try Ana.",
    },
  },
  {
    who: "Sofia",
    side: "left",
    text: {
      es: "Ana, do you review vendor contracts?",
      en: "Ana, do you review vendor contracts?",
    },
  },
  {
    who: "Ana",
    side: "right",
    text: {
      es: "No, Legal handles that. Try Carlos.",
      en: "No, that's Legal. Go with Carlos.",
    },
  },
  {
    who: "Sofia",
    side: "left",
    text: {
      es: "Carlos, can you review this contract?",
      en: "Carlos, can you review this contract?",
    },
  },
  {
    who: "Carlos",
    side: "right",
    text: {
      es: "Sí pero hoy no llego, mañana lo veo.",
      en: "Yes but not today, I'll review tomorrow.",
    },
  },
];

const AFTER_QUESTION = {
  es: "Who reviews vendor contracts?",
  en: "Who reviews vendor contracts?",
};

const AFTER_ANSWER = {
  es: "Los contratos los revisa Carlos Méndez (Legales). Mandale el documento por email con monto y contraparte.",
  en: "Vendor contracts are reviewed by Carlos Méndez (Legal). Send the document via email with amount and counterparty.",
};

export function BeforeAfterAnimation({ locale = "es" }: { locale?: Locale }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <BeforeColumn locale={locale} />
      <AfterColumn locale={locale} />
    </div>
  );
}

function BeforeColumn({ locale }: { locale: Locale }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cycle = async () => {
      while (!cancelled) {
        for (let i = 0; i <= BEFORE_TURNS.length; i++) {
          if (cancelled) return;
          setStep(i);
          await sleep(i === BEFORE_TURNS.length ? 2500 : 1100);
        }
        await sleep(800);
        setStep(0);
      }
    };
    cycle();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 min-h-[460px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          {t("problem.before_label", locale)}
        </div>
        <div className="text-[11px] text-stone-400 font-mono">
          {t("problem.before_channel", locale)}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        {BEFORE_TURNS.slice(0, step).map((turn, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={turn.side === "left" ? "text-left" : "text-right"}
          >
            <div
              className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 ${
                turn.side === "left"
                  ? "bg-white border border-stone-200 rounded-tl-sm"
                  : "bg-stone-200 rounded-tr-sm"
              }`}
            >
              <div className="text-[10px] text-stone-500 font-medium mb-0.5">
                {turn.who}
              </div>
              <div className="text-sm text-stone-800 leading-snug">
                {turn.text[locale]}
              </div>
            </div>
          </motion.div>
        ))}
        {step >= BEFORE_TURNS.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-700"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{t("problem.before_lost", locale)}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function AfterColumn({ locale }: { locale: Locale }) {
  const [phase, setPhase] = useState<"idle" | "ask" | "thinking" | "answer">("idle");

  useEffect(() => {
    let cancelled = false;
    const cycle = async () => {
      while (!cancelled) {
        setPhase("idle");
        await sleep(800);
        if (cancelled) return;
        setPhase("ask");
        await sleep(1500);
        if (cancelled) return;
        setPhase("thinking");
        await sleep(1200);
        if (cancelled) return;
        setPhase("answer");
        await sleep(4500);
      }
    };
    cycle();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border-2 border-accent-200 bg-white p-5 min-h-[460px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-wider text-accent-700 font-medium">
          {t("problem.after_label", locale)}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-3">
        <AnimatePresence mode="wait">
          {(phase === "ask" || phase === "thinking" || phase === "answer") && (
            <motion.div
              key="user"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end"
            >
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-stone-900 px-3.5 py-2 text-sm text-stone-50">
                {AFTER_QUESTION[locale]}
              </div>
            </motion.div>
          )}
          {phase === "thinking" && (
            <motion.div
              key="t"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-stone-500 italic"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent-500 animate-pulse-soft" />
              {t("problem.after_thinking", locale)}
            </motion.div>
          )}
          {phase === "answer" && (
            <motion.div
              key="a"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border border-stone-200"
            >
              <div className="px-4 py-2 border-b border-stone-100 text-[10px] uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Check className="h-3 w-3 text-green-700" strokeWidth={2.5} />{" "}
                {t("problem.after_answer_label", locale)}
              </div>
              <div className="p-4 space-y-2.5">
                <p className="text-sm text-stone-800 leading-relaxed">
                  {AFTER_ANSWER[locale]}
                </p>
                <div className="flex items-center gap-2.5 rounded-md border border-stone-200 p-2 bg-stone-50/60">
                  <Avatar name="Carlos Méndez" size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-stone-900">Carlos Méndez</div>
                    <div className="text-[10px] text-stone-500 font-mono">carlos@bind.com.ar</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {phase === "answer" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 self-start rounded-md bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-700"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="font-medium">{t("problem.after_resolved", locale)}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
