"use client";

/**
 * Post-demo-call closure: animated visualization of the visitor's
 * contribution flowing into the company brain. Replaces the
 * "company graph" link (which goes to /admin) for demo visitors.
 *
 * Visual idea: persona avatar on the left, animated knowledge pills
 * traveling across into a glowing GradientSphere on the right. Each
 * pill labeled with a piece of knowledge the agent (would have)
 * extracted from this persona's interview, derived from the persona's
 * `contributions` array in lib/demo-personas.ts.
 *
 * The motion mirrors the gradient sphere's idle/speaking states so it
 * feels like the brain is consuming the visitor's input in real time.
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, RefreshCw, ArrowRight } from "lucide-react";
import { GradientSphere } from "@/components/gradient-sphere";
import { Avatar } from "@/components/ui/avatar";
import { t } from "@/lib/i18n";
import type { DemoPersona, ContributionType } from "@/lib/demo-personas";

const TYPE_CHIP: Record<ContributionType, string> = {
  tool: "bg-amber-50 text-amber-800 ring-amber-200/60",
  person: "bg-rose-50 text-rose-800 ring-rose-200/60",
  process: "bg-sky-50 text-sky-800 ring-sky-200/60",
  rule: "bg-violet-50 text-violet-800 ring-violet-200/60",
};

const TYPE_LABEL: Record<ContributionType, { en: string; es: string }> = {
  tool: { en: "tool", es: "herramienta" },
  person: { en: "person", es: "persona" },
  process: { en: "process", es: "proceso" },
  rule: { en: "rule", es: "regla" },
};

export function DemoContributionAnim({
  persona,
  locale,
  durationLabel,
  onScheduleDemo,
}: {
  persona: DemoPersona;
  locale: "en" | "es";
  durationLabel: string;
  onScheduleDemo: () => void;
}) {
  const contribs = persona.contributions;
  const lastDelay = contribs.length * 0.45; // when the last pill finishes traveling

  return (
    <div className="flex flex-col items-center text-center max-w-3xl px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          {t("demo_end.eyebrow", locale)}
        </div>
        <h2 className="mt-2 text-2xl md:text-3xl tracking-tight font-medium text-stone-900">
          {t("demo_end.title", locale)}
        </h2>
        <p className="mt-3 text-sm md:text-base text-stone-600 max-w-xl mx-auto leading-relaxed">
          {t("demo_end.subtitle", locale)}
        </p>
        <div className="mt-2 text-xs text-stone-400 font-mono">
          {durationLabel}
        </div>
      </motion.div>

      {/* Animation surface */}
      <div
        className="relative mt-8 w-full max-w-2xl"
        style={{ height: 280 }}
      >
        {/* Persona on the left */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute left-[8%] top-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
        >
          <Avatar name={persona.name} size="lg" />
          <div className="mt-2 text-xs font-medium text-stone-800">
            {persona.name}
          </div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">
            {persona.role[locale]}
          </div>
        </motion.div>

        {/* Sphere on the right */}
        <div className="absolute right-[2%] top-1/2 -translate-y-1/2">
          <GradientSphere phase="speaking" size={220} theme="light" />
        </div>

        {/* Subtle dotted path hint */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 280"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 90 140 Q 280 70 470 140"
            stroke="#a8a29e"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            fill="none"
            opacity="0.35"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
          />
        </svg>

        {/* Traveling pills */}
        {contribs.map((c, i) => {
          // Stagger vertical offsets so pills don't pile on one another
          const yOffset = ((i % 3) - 1) * 30; // -30, 0, 30
          return (
            <motion.div
              key={`${c.label.en}-${i}`}
              initial={{ left: "12%", top: `calc(50% + ${yOffset}px)`, opacity: 0, scale: 0.85 }}
              animate={{
                left: ["12%", "50%", "78%"],
                top: [
                  `calc(50% + ${yOffset}px)`,
                  `calc(50% + ${yOffset / 2}px)`,
                  `calc(50% + ${yOffset / 4}px)`,
                ],
                opacity: [0, 1, 1, 0.2],
                scale: [0.85, 1, 1, 0.6],
              }}
              transition={{
                duration: 2.6,
                delay: 0.6 + i * 0.45,
                ease: "easeInOut",
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-[11px] font-medium ring-1 shadow-sm whitespace-nowrap ${TYPE_CHIP[c.type]}`}
            >
              <span className="opacity-50 mr-1">·</span>
              {c.label[locale]}
            </motion.div>
          );
        })}
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: lastDelay + 1.6 }}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {(["tool", "person", "process", "rule"] as ContributionType[]).map((type) => {
          const count = contribs.filter((c) => c.type === type).length;
          if (count === 0) return null;
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ring-1 ${TYPE_CHIP[type]}`}
            >
              <span className="font-semibold">+{count}</span>
              <span className="opacity-80">{TYPE_LABEL[type][locale]}{count === 1 ? "" : "s"}</span>
            </span>
          );
        })}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: lastDelay + 2 }}
        className="mt-4 text-xs text-stone-500 max-w-md"
      >
        {t("demo_end.note", locale)}
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: lastDelay + 2.4 }}
        className="mt-6 flex flex-wrap gap-3 justify-center"
      >
        <button
          onClick={onScheduleDemo}
          className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          {t("demo_end.cta_schedule", locale)}
          <ArrowRight className="h-4 w-4" />
        </button>
        <Link
          href="/try"
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-500 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {t("demo_end.cta_try_another", locale)}
        </Link>
      </motion.div>
    </div>
  );
}
