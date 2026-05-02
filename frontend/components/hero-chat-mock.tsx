"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, BookOpen, Mail, Phone, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Locale } from "@/lib/i18n";

type Bilingual = { es: string; en: string };

type Scenario =
  | {
      type: "success";
      question: Bilingual;
      answerText: Bilingual;
      person: { name: string; role: Bilingual; email: string; ext: string };
    }
  | {
      type: "policy";
      question: Bilingual;
      answerText: Bilingual;
      facts: Array<{ label: Bilingual; value: Bilingual }>;
    };

const SCENARIOS: Scenario[] = [
  // 1 — Project leadership
  {
    type: "success",
    question: {
      es: "¿Quién está liderando el proyecto Cuenta Joven?",
      en: "Who's leading the Youth Account project?",
    },
    answerText: {
      es: "**Martín Suárez** (Analista Senior de Riesgos) está liderando el proyecto Cuenta Joven. Sponsor: **Carlos Méndez** (VP de Riesgo). Lanzamiento previsto para Q3 2026.",
      en: "**Martín Suárez** (Senior Risk Analyst) is leading the Youth Account project. Sponsor: **Carlos Méndez** (VP of Risk). Launch planned for Q3 2026.",
    },
    person: {
      name: "Martín Suárez",
      role: {
        es: "Analista Senior · Riesgos",
        en: "Senior Analyst · Risk",
      },
      email: "martin@bind.com.ar",
      ext: "2487",
    },
  },

  // 2 — Paternity policy
  {
    type: "policy",
    question: {
      es: "¿Cuál es la política de licencia por paternidad?",
      en: "What's the paternity leave policy?",
    },
    answerText: {
      es: "Tu banco otorga **30 días corridos** de licencia por paternidad, **45 días si es nacimiento múltiple**. Aprobación automática — no requiere autorización del manager.",
      en: "Your bank grants **30 calendar days** of paternity leave, **45 days for multiple births**. Automatic approval — no manager sign-off required.",
    },
    facts: [
      {
        label: { es: "Días", en: "Days" },
        value: { es: "30 corridos", en: "30 calendar" },
      },
      {
        label: { es: "Plazo de aviso", en: "Notice" },
        value: { es: "60 días antes", en: "60 days ahead" },
      },
      {
        label: { es: "Aprobación", en: "Approval" },
        value: { es: "Automática", en: "Automatic" },
      },
      {
        label: { es: "Sistema", en: "System" },
        value: { es: "Workday → RRHH", en: "Workday → HR" },
      },
    ],
  },

  // 3 — Vendor contracts
  {
    type: "success",
    question: {
      es: "¿Quién aprueba contratos con proveedores?",
      en: "Who approves vendor contracts?",
    },
    answerText: {
      es: "Para contratos con proveedores externos, la aprobación final la da **Laura Gómez** (CFO). Si el monto supera USD 50.000, requiere también firma de **Mariana Torres** (CEO). Pasa por Legales antes de la firma.",
      en: "Vendor contracts require final approval from **Laura Gómez** (CFO). Above USD 50,000, **Mariana Torres** (CEO) signature is also required. Routes through Legal before signature.",
    },
    person: {
      name: "Laura Gómez",
      role: {
        es: "CFO · Finanzas",
        en: "CFO · Finance",
      },
      email: "laura@bind.com.ar",
      ext: "1014",
    },
  },
];

export function HeroChatMock({ locale = "es" }: { locale?: Locale }) {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "thinking" | "answer" | "rest">("typing");
  const [typed, setTyped] = useState("");

  const scenario = SCENARIOS[scenarioIdx];

  useEffect(() => {
    let cancelled = false;
    const cycle = async () => {
      // Typing
      setPhase("typing");
      setTyped("");
      const text = scenario.question[locale];
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        await sleep(28);
        setTyped(text.slice(0, i));
      }
      await sleep(450);

      if (cancelled) return;
      setPhase("thinking");
      await sleep(1500);

      if (cancelled) return;
      setPhase("answer");
      await sleep(7500);

      if (cancelled) return;
      setPhase("rest");
      setTyped("");
      await sleep(900);

      if (cancelled) return;
      setScenarioIdx((idx) => (idx + 1) % SCENARIOS.length);
    };
    cycle();
    return () => {
      cancelled = true;
    };
  }, [scenarioIdx, scenario, locale]);

  const labels = LABELS[locale];

  const thinkingText =
    scenario.type === "policy"
      ? labels.thinkingPolicy
      : labels.thinkingPerson;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.18)] overflow-hidden">
      <div className="p-5 space-y-4 min-h-[440px]">
        {/* User message */}
        <AnimatePresence mode="wait">
          {typed.length > 0 && (
            <motion.div
              key={`user-${scenarioIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex justify-end"
            >
              <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-stone-900 px-4 py-2.5 text-stone-50">
                <p className="text-sm leading-relaxed">
                  {typed}
                  {phase === "typing" && (
                    <span className="inline-block w-0.5 h-3 ml-0.5 bg-stone-50 animate-pulse" />
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {phase === "thinking" && (
            <motion.div
              key={`thinking-${scenarioIdx}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-stone-500 italic"
            >
              <Sparkles className="h-4 w-4 text-accent-500 animate-pulse-soft" />
              {thinkingText}
            </motion.div>
          )}

          {(phase === "answer" || phase === "rest") && (
            <motion.div
              key={`answer-${scenarioIdx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg border border-stone-200 bg-white"
            >
              <AnswerHeader type={scenario.type} labels={labels} />
              <div className="p-4 space-y-3">
                <p className="text-sm text-stone-800 leading-relaxed">
                  {renderTextWithBold(scenario.answerText[locale])}
                </p>

                {scenario.type === "success" && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-md border border-stone-200 bg-stone-50/60 p-3 flex items-start gap-3"
                  >
                    <Avatar name={scenario.person.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-stone-900">
                        {scenario.person.name}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {scenario.person.role[locale]}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-stone-600 font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-2.5 w-2.5" />
                          {scenario.person.email}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />
                          {scenario.person.ext}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {scenario.type === "policy" && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {scenario.facts.map((f, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-stone-200 bg-stone-50/60 px-3 py-2"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-stone-500">
                          {f.label[locale]}
                        </div>
                        <div className="text-sm font-medium text-stone-900 mt-0.5">
                          {f.value[locale]}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scenario indicator dots */}
      <div className="flex items-center justify-center gap-1.5 pb-4">
        {SCENARIOS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === scenarioIdx ? "w-6 bg-stone-700" : "w-1.5 bg-stone-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const LABELS = {
  es: {
    answer: "Respuesta",
    policy: "Política interna",
    confidenceSuccess: "confianza 94%",
    confidencePolicy: "confianza 96%",
    thinkingPerson: "Buscando entrevistas relevantes…",
    thinkingPolicy: "Buscando políticas internas · verificando vigencia…",
  },
  en: {
    answer: "Answer",
    policy: "Internal policy",
    confidenceSuccess: "confidence 94%",
    confidencePolicy: "confidence 96%",
    thinkingPerson: "Searching relevant interviews…",
    thinkingPolicy: "Searching internal policies · checking validity…",
  },
};

function AnswerHeader({
  type,
  labels,
}: {
  type: "success" | "policy";
  labels: typeof LABELS.es;
}) {
  if (type === "policy") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 text-[11px] uppercase tracking-wider text-stone-500">
        <BookOpen className="h-3 w-3 text-blue-700" strokeWidth={2} />
        <span>{labels.policy}</span>
        <span className="ml-auto font-mono text-stone-400">
          {labels.confidencePolicy}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 text-[11px] uppercase tracking-wider text-stone-500">
      <Check className="h-3 w-3 text-green-700" strokeWidth={2.5} />
      {labels.answer}
      <span className="ml-auto font-mono text-stone-400">
        {labels.confidenceSuccess}
      </span>
    </div>
  );
}

function renderTextWithBold(text: string) {
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
