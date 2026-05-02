"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Wrench, KeyRound, Workflow, BookOpen, Lightbulb } from "lucide-react";
import { getSkillsFile, ApiError } from "@/lib/api";
import type { SkillsFile } from "@/lib/types";

type Tab = "people" | "tools" | "access_paths" | "processes" | "glossary" | "informal_rules";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "people", label: "Personas", icon: <Users className="h-4 w-4" /> },
  { key: "tools", label: "Sistemas", icon: <Wrench className="h-4 w-4" /> },
  { key: "access_paths", label: "Accesos", icon: <KeyRound className="h-4 w-4" /> },
  { key: "processes", label: "Procesos", icon: <Workflow className="h-4 w-4" /> },
  { key: "glossary", label: "Glosario", icon: <BookOpen className="h-4 w-4" /> },
  { key: "informal_rules", label: "Reglas no escritas", icon: <Lightbulb className="h-4 w-4" /> },
];

export default function BrainPage() {
  const [sf, setSf] = useState<SkillsFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("people");

  useEffect(() => {
    getSkillsFile()
      .then(setSf)
      .catch((err) => {
        const msg = err instanceof ApiError ? err.message : String(err);
        setError(msg);
      });
  }, []);

  if (error) return <div className="text-sm text-red-700">{error}</div>;
  if (!sf)
    return (
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Brain · {sf.organization_name}</h1>
        <p className="text-sm text-ink-500">
          Versión {sf.version} · actualizado {new Date(sf.generated_at).toLocaleString("es-AR")}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-ink-200 pb-2">
        {TABS.map((t) => {
          const count = (sf as any)[t.key]?.length ?? 0;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                active
                  ? "inline-flex items-center gap-2 rounded-full bg-ink-900 px-3 py-1.5 text-sm font-medium text-white"
                  : "inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-accent"
              }
            >
              {t.icon}
              {t.label}
              <span className={active ? "text-white/70" : "text-ink-400"}>{count}</span>
            </button>
          );
        })}
      </nav>

      <section className="space-y-2">
        {tab === "people" &&
          sf.people.map((p) => (
            <Row key={p.id} title={p.name} subtitle={`${p.role} · ${p.area}`} extra={p.email} />
          ))}
        {tab === "tools" &&
          sf.tools.map((t) => <Row key={t.id} title={t.name} subtitle={t.purpose} />)}
        {tab === "access_paths" &&
          sf.access_paths.map((ap) => (
            <Row
              key={ap.id}
              title={ap.target_tool_id}
              subtitle={`a ${ap.requested_to}${ap.sla ? ` · ${ap.sla}` : ""}`}
              extra={ap.requires.join(" · ")}
            />
          ))}
        {tab === "processes" &&
          sf.processes.map((pr) => (
            <Row key={pr.id} title={pr.name} subtitle={pr.description} extra={pr.owner_id} />
          ))}
        {tab === "glossary" &&
          sf.glossary.map((g) => <Row key={g.id} title={g.term} subtitle={g.definition} />)}
        {tab === "informal_rules" &&
          sf.informal_rules.map((r) => (
            <Row key={r.id} title={r.description} subtitle={r.context} />
          ))}
      </section>
    </div>
  );
}

function Row({
  title,
  subtitle,
  extra,
}: {
  title: string;
  subtitle?: string;
  extra?: string;
}) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
      <div className="font-medium text-ink-900">{title}</div>
      {subtitle && <div className="text-sm text-ink-600">{subtitle}</div>}
      {extra && <div className="mt-1 font-mono text-xs text-ink-400">{extra}</div>}
    </div>
  );
}
