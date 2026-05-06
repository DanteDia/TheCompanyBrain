"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { LocaleToggle, useLocale } from "@/components/locale-toggle";
import { ScheduleDemoModal } from "@/components/schedule-demo-modal";
import { t } from "@/lib/i18n";

export function SiteHeader() {
  const [locale, setLocale] = useLocale();
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-stone-600">
            <a href="#producto" className="hover:text-stone-900 transition-colors">
              {t("nav.product", locale)}
            </a>
            <a href="#integraciones" className="hover:text-stone-900 transition-colors">
              {t("nav.integrations", locale)}
            </a>
            <Link
              href="/try"
              className="hover:text-stone-900 transition-colors font-medium text-stone-700"
            >
              {t("nav.demo_call", locale)}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleToggle locale={locale} onChange={setLocale} />
            <Button
              variant="default"
              size="sm"
              onClick={() => setBookingOpen(true)}
            >
              {t("nav.book_demo", locale)}
            </Button>
          </div>
        </div>
      </div>

      <ScheduleDemoModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </header>
  );
}
