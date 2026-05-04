"use client";

/**
 * Admin Settings — per-organization preferences. For V1 the only setting
 * is the agent's spoken language. Persisted in localStorage keyed by org
 * id; the /interview/[id] page reads it on mount and forwards it to the
 * web-initiate endpoint as the language dynamic_variable for Retell.
 */

import { useEffect, useState } from "react";
import { Globe2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ORGANIZATION } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Lang = "en" | "es";

const STORAGE_KEY = (orgId: string) => `cb-org-language-${orgId}`;

export function getOrgLanguage(orgId: string): Lang {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(STORAGE_KEY(orgId));
  return v === "es" ? "es" : "en";
}

export default function AdminSettingsPage() {
  const orgId = ORGANIZATION.id ?? "tcb_demo";
  const [lang, setLang] = useState<Lang>("en");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLang(getOrgLanguage(orgId));
  }, [orgId]);

  function update(next: Lang) {
    setLang(next);
    localStorage.setItem(STORAGE_KEY(orgId), next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          Configuration
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Settings
        </h1>
        <p className="mt-2 text-stone-600">
          Per-organization preferences. Currently scoped to{" "}
          <strong>{ORGANIZATION.name}</strong>.
        </p>
      </header>

      <Card className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="rounded-md bg-accent-50 p-2">
            <Globe2 className="h-4 w-4 text-accent-600" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-base font-medium text-stone-900">
              Default agent language
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Language the voice agent uses for interviews and the language
              the Q&amp;A bot answers in. Forwarded to Retell as a per-call{" "}
              <code className="text-xs">language</code> dynamic variable, so
              you can change it per organization without redeploying.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <LanguageOption
            value="en"
            label="English"
            description="agent speaks English"
            selected={lang === "en"}
            onSelect={() => update("en")}
          />
          <LanguageOption
            value="es"
            label="Español"
            description="agent speaks Spanish"
            selected={lang === "es"}
            onSelect={() => update("es")}
          />
        </div>

        {saved && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-800">
            <Check className="h-3.5 w-3.5" />
            Saved — applies on the next interview call you start.
          </div>
        )}
      </Card>

      <p className="mt-6 text-xs text-stone-500">
        Stored locally per browser. For multi-admin setups we'll move this
        to the Supabase <code>organizations.settings</code> column.
      </p>
    </div>
  );
}

function LanguageOption({
  value,
  label,
  description,
  selected,
  onSelect,
}: {
  value: Lang;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "rounded-lg border px-4 py-3 text-left transition-all",
        selected
          ? "border-accent-500 bg-accent-50 ring-2 ring-accent-200"
          : "border-stone-200 bg-white hover:border-stone-400"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs font-mono uppercase tracking-wider",
            selected ? "text-accent-700" : "text-stone-500"
          )}
        >
          {value}
        </span>
        {selected && <Check className="h-3.5 w-3.5 text-accent-600" />}
      </div>
      <div className="mt-1.5 text-sm font-medium text-stone-900">{label}</div>
      <div className="text-xs text-stone-500 mt-0.5">{description}</div>
    </button>
  );
}
