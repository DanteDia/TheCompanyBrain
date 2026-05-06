"use client";

/**
 * /try — public voice-demo lobby.
 *
 * Visitors pick (1) a language and (2) a persona at Blur Bank, then we
 * forward them to /interview/<employee_id>?demo=1&lang=<en|es>. The
 * interview page handles Retell wiring; we only own the lobby UX.
 *
 * No email gate, no signup. We tag the call as `demo` so the post-
 * interview pipeline skips persisting extractions back into the
 * Blur Bank seed.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mic } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { DEMO_PERSONAS, type DemoPersona } from "@/lib/demo-personas";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ACCENT_CLASSES: Record<DemoPersona["accent"], string> = {
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
};

export default function TryDemoPage() {
  const router = useRouter();
  const [locale, setLocale] = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  function handleStart() {
    if (!selected) return;
    setStarting(true);
    const url = `/interview/${selected}?org=tcb_demo&demo=1&lang=${locale}`;
    router.push(url);
  }

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
            </Link>
            <div className="flex items-center gap-3">
              <LocaleToggle locale={locale} onChange={setLocale} />
              <Link
                href="/"
                className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                {t("try.back_to_landing", locale)}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 mb-5">
            <Mic className="h-3 w-3" />
            {t("try.eyebrow", locale)}
          </div>
          <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-stone-900">
            {t("try.title", locale)}
          </h1>
          <p className="mt-4 text-stone-600 text-base md:text-lg leading-relaxed">
            {t("try.subtitle", locale)}
          </p>
        </motion.div>

        {/* Step 1 — language */}
        <section className="mt-14">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-400">
              {t("try.step", locale)} 1
            </span>
            <h2 className="text-base font-medium text-stone-900">
              {t("try.step1_title", locale)}
            </h2>
          </div>
          <div className="flex gap-3">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  "flex-1 max-w-[200px] rounded-xl border px-5 py-4 text-left transition-all",
                  locale === l
                    ? "border-stone-900 bg-white shadow-sm"
                    : "border-stone-200 bg-white/60 hover:border-stone-400 hover:bg-white"
                )}
              >
                <div className="text-sm font-medium text-stone-900">
                  {l === "en" ? "English" : "Español"}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {l === "en"
                    ? "The agent speaks English"
                    : "El agente habla en español"}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2 — persona */}
        <section className="mt-12">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-400">
              {t("try.step", locale)} 2
            </span>
            <h2 className="text-base font-medium text-stone-900">
              {t("try.step2_title", locale)}
            </h2>
          </div>
          <p className="text-sm text-stone-500 mb-6 max-w-2xl">
            {t("try.step2_subtitle", locale)}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEMO_PERSONAS.map((p, i) => {
              const isSelected = selected === p.employee_id;
              return (
                <motion.button
                  key={p.employee_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  onClick={() => setSelected(p.employee_id)}
                  className={cn(
                    "group flex items-start gap-4 rounded-xl border p-5 text-left transition-all",
                    isSelected
                      ? "border-stone-900 bg-white shadow-md ring-1 ring-stone-900"
                      : "border-stone-200 bg-white/60 hover:border-stone-400 hover:bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ring-1 shrink-0",
                      ACCENT_CLASSES[p.accent]
                    )}
                  >
                    {p.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-stone-900 truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider text-stone-400 font-mono whitespace-nowrap">
                        {p.area[locale]}
                      </div>
                    </div>
                    <div className="text-sm text-stone-700 font-medium mt-0.5">
                      {p.role[locale]}
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed mt-2">
                      {p.blurb[locale]}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-14 flex flex-col items-center">
          <motion.button
            disabled={!selected || starting}
            onClick={handleStart}
            whileHover={selected ? { scale: 1.02 } : {}}
            whileTap={selected ? { scale: 0.98 } : {}}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-all",
              selected
                ? "bg-stone-900 text-white shadow-lg hover:bg-stone-800"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            )}
          >
            {starting ? (
              <span>{t("try.starting", locale)}</span>
            ) : (
              <>
                <span>{t("try.cta", locale)}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
          <p className="mt-4 text-xs text-stone-400 max-w-md text-center leading-relaxed">
            {t("try.disclaimer", locale)}
          </p>
        </section>
      </main>
    </div>
  );
}
