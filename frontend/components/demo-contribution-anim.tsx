"use client";

/**
 * Post-demo-call closure: animated visualization of the visitor's
 * contribution flowing into the company brain. Replaces the
 * "company graph" link (which goes to /admin) for demo visitors.
 *
 * Design language matches the GradientSphere — wireframe / minimal
 * lines, soft shadows, monospace labels, gradient dots that mirror
 * the sphere's amber/orange palette. The sphere pulses each time a
 * pill is absorbed so the feeding feels physical.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Calendar,
  RefreshCw,
  ArrowRight,
  Wrench,
  User,
  Workflow,
  ScrollText,
  Eye,
  X,
  Check,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { GradientSphere } from "@/components/gradient-sphere";
import { Avatar } from "@/components/ui/avatar";
import { t } from "@/lib/i18n";
import type { DemoPersona, Contribution, ContributionType } from "@/lib/demo-personas";

const TYPE_ICON: Record<ContributionType, LucideIcon> = {
  tool: Wrench,
  person: User,
  process: Workflow,
  rule: ScrollText,
};

const TYPE_DOT_GRADIENT: Record<ContributionType, string> = {
  tool: "from-amber-400 via-orange-400 to-amber-200",
  person: "from-rose-400 via-pink-400 to-rose-200",
  process: "from-sky-400 via-cyan-400 to-sky-200",
  rule: "from-violet-400 via-purple-400 to-violet-200",
};

const TYPE_GLOW: Record<ContributionType, string> = {
  tool: "shadow-[0_0_8px_rgba(245,158,11,0.45)]",
  person: "shadow-[0_0_8px_rgba(244,63,94,0.45)]",
  process: "shadow-[0_0_8px_rgba(14,165,233,0.45)]",
  rule: "shadow-[0_0_8px_rgba(139,92,246,0.45)]",
};

const TYPE_TEXT: Record<ContributionType, string> = {
  tool: "text-amber-700",
  person: "text-rose-700",
  process: "text-sky-700",
  rule: "text-violet-700",
};

const TYPE_LABEL: Record<ContributionType, { en: string; es: string }> = {
  tool: { en: "tool", es: "herramienta" },
  person: { en: "person", es: "persona" },
  process: { en: "process", es: "proceso" },
  rule: { en: "rule", es: "regla" },
};

const TRAVEL_DURATION = 2.4;
const TRAVEL_STAGGER = 0.42;
const TRAVEL_BASE_DELAY = 0.7;

/** A traveling node — visually a thin pill with a gradient dot, matching
 *  the sphere's wireframe aesthetic instead of looking like a flat UI chip. */
function TravelingNode({
  contribution,
  index,
  yOffset,
  locale,
}: {
  contribution: Contribution;
  index: number;
  yOffset: number;
  locale: "en" | "es";
}) {
  const Icon = TYPE_ICON[contribution.type];
  const startTop = `calc(50% + ${yOffset}px)`;
  const midTop = `calc(50% + ${yOffset * 0.4 - 22}px)`;
  const endTop = `calc(50% + ${yOffset * 0.15}px)`;

  return (
    <motion.div
      initial={{ left: "14%", top: startTop, opacity: 0, scale: 0.7, rotate: -4 }}
      animate={{
        left: ["14%", "48%", "76%"],
        top: [startTop, midTop, endTop],
        opacity: [0, 1, 1, 0],
        scale: [0.7, 1, 1.04, 0.45],
        rotate: [-4, 0, 3, 0],
      }}
      transition={{
        duration: TRAVEL_DURATION,
        delay: TRAVEL_BASE_DELAY + index * TRAVEL_STAGGER,
        times: [0, 0.2, 0.85, 1],
        ease: [0.32, 0.72, 0.34, 1.0],
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
    >
      <div
        className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-stone-200 px-2.5 py-1 shadow-[0_4px_16px_rgba(15,12,10,0.06)]"
        style={{ willChange: "transform" }}
      >
        <span
          className={`h-2 w-2 rounded-full bg-gradient-to-br ${TYPE_DOT_GRADIENT[contribution.type]} ${TYPE_GLOW[contribution.type]}`}
        />
        <Icon className={`h-3 w-3 ${TYPE_TEXT[contribution.type]}`} strokeWidth={1.6} />
        <span className="text-[10px] font-mono text-stone-700 tracking-tight whitespace-nowrap">
          {contribution.label[locale]}
        </span>
      </div>
    </motion.div>
  );
}

/** Static review-modal row — used when the visitor wants to confirm
 *  what the agent captured. Names of people and tools are the fields
 *  most error-prone, so they get explicit confirm/flag buttons. */
function ReviewRow({
  contribution,
  locale,
}: {
  contribution: Contribution;
  locale: "en" | "es";
}) {
  const Icon = TYPE_ICON[contribution.type];
  const [state, setState] = useState<"pending" | "confirmed" | "flagged">("pending");

  const stateClasses = {
    pending: "border-stone-200 bg-white",
    confirmed: "border-emerald-200 bg-emerald-50/50",
    flagged: "border-amber-200 bg-amber-50/50",
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${stateClasses[state]}`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`h-2 w-2 rounded-full bg-gradient-to-br ${TYPE_DOT_GRADIENT[contribution.type]} ${TYPE_GLOW[contribution.type]}`}
        />
        <Icon className={`h-4 w-4 ${TYPE_TEXT[contribution.type]}`} strokeWidth={1.6} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
          {TYPE_LABEL[contribution.type][locale]}
        </div>
        <div className="text-sm text-stone-900 font-medium truncate">
          {contribution.label[locale]}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          aria-label="confirm"
          onClick={() => setState((s) => (s === "confirmed" ? "pending" : "confirmed"))}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
            state === "confirmed"
              ? "border-emerald-400 bg-emerald-100 text-emerald-700"
              : "border-stone-200 text-stone-400 hover:border-emerald-300 hover:text-emerald-600"
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          aria-label="flag"
          onClick={() => setState((s) => (s === "flagged" ? "pending" : "flagged"))}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
            state === "flagged"
              ? "border-amber-400 bg-amber-100 text-amber-700"
              : "border-stone-200 text-stone-400 hover:border-amber-300 hover:text-amber-600"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function ReviewModal({
  open,
  onClose,
  persona,
  contribs,
  isReal,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  persona: DemoPersona;
  contribs: Contribution[];
  isReal: boolean;
  locale: "en" | "es";
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0.34, 1.0] }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between px-6 py-5 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                    {t("demo_end.review_eyebrow", locale)}
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isReal
                        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60"
                        : "bg-stone-100 text-stone-500 ring-1 ring-stone-200"
                    }`}
                  >
                    {isReal ? t("demo_end.review_badge_real", locale) : t("demo_end.review_badge_preview", locale)}
                  </span>
                </div>
                <h3 className="text-lg font-medium tracking-tight text-stone-900 mt-1">
                  {t("demo_end.review_title", locale)}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-stone-400 hover:text-stone-700 transition-colors"
                aria-label="close"
              >
                <X className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </header>

            <p className="px-6 pt-4 text-sm text-stone-600 leading-relaxed">
              {t("demo_end.review_intro", locale)}
            </p>

            <div className="px-6 py-4 space-y-2 overflow-y-auto">
              {contribs.map((c, i) => (
                <ReviewRow key={i} contribution={c} locale={locale} />
              ))}
            </div>

            <footer className="px-6 py-4 border-t border-stone-100 bg-stone-50/60">
              <p className="text-xs text-stone-500 leading-relaxed">
                {t("demo_end.review_footer", locale)}
              </p>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DemoContributionAnim({
  persona,
  locale,
  durationLabel,
  onScheduleDemo,
  extractedContribs,
  extracting,
}: {
  persona: DemoPersona;
  locale: "en" | "es";
  durationLabel: string;
  onScheduleDemo: () => void;
  /** Real entities pulled by Haiku from the call transcript. When provided,
   *  the Review modal shows these instead of the curated mocks. */
  extractedContribs?: Contribution[] | null;
  /** True while Haiku is still running; we show a small loading hint
   *  on the Review CTA. */
  extracting?: boolean;
}) {
  const contribs = persona.contributions;
  const [pulseKey, setPulseKey] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const cleanupRef = useRef<number[]>([]);

  // Trigger a sphere pulse exactly when each pill arrives at the sphere.
  // Arrival = ~85% through the travel curve (matches the `times` array
  // we pass to the TravelingNode animation).
  useEffect(() => {
    cleanupRef.current.forEach(clearTimeout);
    cleanupRef.current = [];
    contribs.forEach((_, i) => {
      const arrivalMs = (TRAVEL_BASE_DELAY + i * TRAVEL_STAGGER + TRAVEL_DURATION * 0.85) * 1000;
      const id = window.setTimeout(() => {
        setPulseKey((k) => k + 1);
      }, arrivalMs);
      cleanupRef.current.push(id);
    });
    return () => {
      cleanupRef.current.forEach(clearTimeout);
    };
  }, [contribs]);

  const lastArrivalDelay =
    TRAVEL_BASE_DELAY + (contribs.length - 1) * TRAVEL_STAGGER + TRAVEL_DURATION;

  return (
    <div className="flex flex-col items-center text-center max-w-3xl px-4">
      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        persona={persona}
        contribs={extractedContribs && extractedContribs.length > 0 ? extractedContribs : persona.contributions}
        isReal={Boolean(extractedContribs && extractedContribs.length > 0)}
        locale={locale}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
          {t("demo_end.eyebrow", locale)}
        </div>
        <h2 className="mt-2 text-2xl md:text-3xl tracking-tight font-medium text-stone-900">
          {t("demo_end.title", locale)}
        </h2>
        <p className="mt-3 text-sm md:text-base text-stone-600 max-w-xl mx-auto leading-relaxed">
          {t("demo_end.subtitle", locale)}
        </p>
        <div className="mt-2 text-[11px] text-stone-400 font-mono">
          {durationLabel}
        </div>
      </motion.div>

      {/* Animation surface */}
      <div className="relative mt-8 w-full max-w-2xl" style={{ height: 240 }}>
        {/* Persona on the left */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute left-[6%] top-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
        >
          <Avatar name={persona.name} size="lg" />
          <div className="mt-2 text-xs font-medium text-stone-800">
            {persona.name}
          </div>
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider mt-0.5">
            {persona.role[locale]}
          </div>
        </motion.div>

        {/* Sphere on the right — pulses on each pill arrival via key change */}
        <div className="absolute right-[2%] top-1/2 -translate-y-1/2">
          <motion.div
            key={pulseKey}
            initial={pulseKey === 0 ? { scale: 1, filter: "brightness(1)" } : false}
            animate={{
              scale: [1, 1.08, 1],
              filter: ["brightness(1)", "brightness(1.18)", "brightness(1)"],
            }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformOrigin: "center" }}
          >
            <GradientSphere phase="speaking" size={180} theme="light" />
          </motion.div>

          {/* Halo ring that breathes on pulse */}
          <motion.div
            key={`halo-${pulseKey}`}
            initial={pulseKey === 0 ? { opacity: 0 } : false}
            animate={{ opacity: [0, 0.5, 0], scale: [1, 1.25, 1.45] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 60%)",
            }}
          />
        </div>

        {/* Curved path hint — bezier from persona to sphere */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 280"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 90 140 Q 280 60 470 140"
            stroke="#a8a29e"
            strokeWidth="1"
            strokeDasharray="2 6"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 1.2, delay: 0.35 }}
          />
        </svg>

        {/* Traveling pills */}
        {contribs.map((c, i) => {
          const yOffset = ((i % 3) - 1) * 32;
          return <TravelingNode key={i} contribution={c} index={i} yOffset={yOffset} locale={locale} />;
        })}
      </div>

      {/* Stat chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: lastArrivalDelay - 0.4 }}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {(["tool", "person", "process", "rule"] as ContributionType[]).map((type) => {
          const count = contribs.filter((c) => c.type === type).length;
          if (count === 0) return null;
          const Icon = TYPE_ICON[type];
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1 text-[11px] font-mono text-stone-700 shadow-sm"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${TYPE_DOT_GRADIENT[type]}`}
              />
              <Icon className={`h-3 w-3 ${TYPE_TEXT[type]}`} strokeWidth={1.6} />
              <span className="font-semibold">+{count}</span>
              <span className="opacity-70">
                {TYPE_LABEL[type][locale]}{count === 1 ? "" : "s"}
              </span>
            </span>
          );
        })}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: lastArrivalDelay }}
        className="mt-4 text-xs text-stone-500 max-w-md"
      >
        {t("demo_end.note", locale)}
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: lastArrivalDelay + 0.3 }}
        className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-3 justify-center items-stretch sm:items-center"
      >
        <button
          onClick={() => setReviewOpen(true)}
          disabled={extracting}
          className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors disabled:opacity-60"
        >
          {extracting ? (
            <span className="h-4 w-4 inline-block rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={1.8} />
          )}
          {extracting ? t("demo_end.cta_review_loading", locale) : t("demo_end.cta_review", locale)}
        </button>
        <button
          onClick={onScheduleDemo}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-500 transition-colors"
        >
          <Calendar className="h-4 w-4" strokeWidth={1.8} />
          {t("demo_end.cta_schedule", locale)}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
        <Link
          href="/try"
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-600 hover:border-stone-400 transition-colors"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
          {t("demo_end.cta_try_another", locale)}
        </Link>
      </motion.div>
    </div>
  );
}
