"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Users,
  Wrench,
  KeyRound,
  Lightbulb,
  Workflow,
  BookOpen,
  Shield,
  FileCheck,
  Eye,
  ArrowRight,
  Mic,
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { HeroChatMock } from "@/components/hero-chat-mock";
import { BeforeAfterAnimation } from "@/components/before-after-animation";
import { IntegrationCard } from "@/components/integration-card";
import { BrainNetwork } from "@/components/brain-network";
import { RotatingWord } from "@/components/rotating-word";
import { ScheduleDemoModal } from "@/components/schedule-demo-modal";
import { INTEGRATIONS } from "@/lib/mock-data";
import { useLocale } from "@/components/locale-toggle";
import { t } from "@/lib/i18n";

export default function LandingPage() {
  const [locale] = useLocale();
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50 [mask-image:radial-gradient(ellipse_at_top,white,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl tracking-tight font-medium text-stone-900 leading-[1.02]">
                The Company Brain
                <br />
                <span className="whitespace-nowrap">
                  For Your <RotatingWord />
                </span>
              </h1>

              {/* Brain visualization with animated connections */}
              <div className="mt-12 mb-12">
                <BrainNetwork />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-stretch gap-3">
                  <Link href="/try" className="group">
                    <Button size="lg" className="h-auto py-3 px-5">
                      <Mic className="h-4 w-4" />
                      <span className="flex flex-col items-start leading-tight ml-1">
                        <span className="text-sm font-semibold">
                          {t("hero.cta_voice", locale)}
                        </span>
                        <span className="text-[11px] font-normal opacity-70">
                          {t("hero.cta_voice_sub", locale)}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                  <Link href="/ask" className="group">
                    <Button variant="outline" size="lg" className="h-auto py-3 px-5">
                      <MessageCircle className="h-4 w-4" />
                      <span className="flex flex-col items-start leading-tight ml-1">
                        <span className="text-sm font-semibold">
                          {t("hero.cta_chat", locale)}
                        </span>
                        <span className="text-[11px] font-normal opacity-70">
                          {t("hero.cta_chat_sub", locale)}
                        </span>
                      </span>
                    </Button>
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="text-sm text-stone-500 hover:text-stone-900 transition-colors self-start underline-offset-4 hover:underline"
                >
                  {t("hero.cta_schedule", locale)}
                </button>
              </div>
            </div>

            {/* Right — Hero chat mock */}
            <div className="lg:pl-4">
              <HeroChatMock locale={locale} />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA — Antes vs Después */}
      <section className="border-t border-stone-200/80 bg-white py-24 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-[11px] uppercase tracking-wider text-accent-600 font-medium mb-4">
              {t("problem.eyebrow", locale)}
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl tracking-tight font-medium text-stone-900 leading-[1.05]">
              {t("problem.title", locale)}
            </h2>
            <p className="mt-6 text-stone-600 text-lg md:text-xl leading-relaxed">
              {t("problem.subtitle1", locale)}
            </p>
            <p className="mt-3 text-stone-500 text-base md:text-lg leading-relaxed">
              {t("problem.subtitle2", locale)}
            </p>
          </div>
          <BeforeAfterAnimation locale={locale} />
        </div>
      </section>

      {/* LO QUE CAPTURA */}
      <section id="producto" className="border-t border-stone-200/80 bg-white py-24 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-[11px] uppercase tracking-wider text-accent-600 font-medium mb-4">
              {t("captures.eyebrow", locale)}
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl tracking-tight font-medium text-stone-900 leading-[1.05]">
              {t("captures.title", locale)}
            </h2>
            <p className="mt-6 text-stone-600 text-lg leading-relaxed">
              {t("captures.subtitle", locale)}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-200 rounded-2xl overflow-hidden border border-stone-200">
            {[
              { Icon: Users, title: t("captures.people", locale), desc: t("captures.people_desc", locale) },
              { Icon: Wrench, title: t("captures.tools", locale), desc: t("captures.tools_desc", locale) },
              { Icon: KeyRound, title: t("captures.access", locale), desc: t("captures.access_desc", locale) },
              { Icon: Lightbulb, title: t("captures.tribal", locale), desc: t("captures.tribal_desc", locale), highlight: true },
              { Icon: Workflow, title: t("captures.processes", locale), desc: t("captures.processes_desc", locale) },
              { Icon: BookOpen, title: t("captures.glossary", locale), desc: t("captures.glossary_desc", locale) },
            ].map(({ Icon, title, desc, highlight }) => (
              <div
                key={title}
                className={`relative bg-white p-7 hover:bg-stone-50/40 transition-colors group ${
                  highlight ? "ring-1 ring-accent-200" : ""
                }`}
              >
                <div className="mb-5">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      highlight
                        ? "bg-accent-100 text-accent-700"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                </div>
                <h3 className="text-base font-medium text-stone-900 mb-1.5">
                  {title}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
                {highlight && (
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[9px] uppercase tracking-wider text-accent-700 font-medium">
                    <span className="h-1 w-1 rounded-full bg-accent-500" />
                    {locale === "es" ? "El moat" : "The moat"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRACIONES */}
      <section id="integraciones" className="border-t border-stone-200/80 py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[11px] uppercase tracking-wider text-accent-600 font-medium mb-3">
              {t("integrations.eyebrow", locale)}
            </div>
            <h2 className="text-3xl md:text-4xl tracking-tight font-medium text-stone-900">
              {t("integrations.title", locale)}
            </h2>
            <p className="mt-3 text-stone-600 text-lg">
              {t("integrations.subtitle", locale)}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {INTEGRATIONS.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>
      </section>

      {/* SEGURIDAD */}
      <section className="border-t border-stone-200/80 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[11px] uppercase tracking-wider text-accent-600 font-medium mb-3">
              Seguridad y compliance
            </div>
            <h2 className="text-3xl md:text-4xl tracking-tight font-medium text-stone-900">
              {t("security.title", locale)}
            </h2>
            <p className="mt-3 text-stone-600 text-lg">
              {t("security.subtitle", locale)}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { Icon: Shield, title: t("security.sso_title", locale), desc: t("security.sso_desc", locale) },
              { Icon: FileCheck, title: t("security.audit_title", locale), desc: t("security.audit_desc", locale) },
              { Icon: Eye, title: t("security.permissions_title", locale), desc: t("security.permissions_desc", locale) },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-stone-200 p-6">
                <Icon className="h-6 w-6 text-stone-700 mb-4" strokeWidth={1.5} />
                <h3 className="text-base font-medium text-stone-900 mb-2">{title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-stone-200/80 py-12 bg-stone-50">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="text-sm text-stone-500">
                · {t("footer.tagline", locale)}
              </span>
            </div>
            <div className="text-xs text-stone-400 font-mono">
              © 2026 Company Brain
            </div>
          </div>
        </div>
      </footer>

      <ScheduleDemoModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}

