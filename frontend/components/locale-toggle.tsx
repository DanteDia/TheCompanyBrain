"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

export function useLocale(): [Locale, (l: Locale) => void] {
  const [locale, setLocale] = useState<Locale>("es");

  useEffect(() => {
    const stored = localStorage.getItem("cb-locale") as Locale | null;
    if (stored === "es" || stored === "en") setLocale(stored);
  }, []);

  const update = (l: Locale) => {
    setLocale(l);
    localStorage.setItem("cb-locale", l);
    document.documentElement.lang = l;
  };

  return [locale, update];
}

export function LocaleToggle({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-stone-200 p-0.5 bg-white">
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={cn(
            "px-2 py-1 text-xs font-medium rounded transition-colors uppercase tracking-wider",
            locale === l
              ? "bg-stone-900 text-white"
              : "text-stone-500 hover:text-stone-900"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
