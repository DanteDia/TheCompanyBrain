"use client";

import { useState } from "react";
import { Wrench, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBrain } from "@/lib/use-brain";
import { cn } from "@/lib/utils";

export default function ToolsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const brain = useBrain();
  const TOOLS = brain.data.tools;
  const findPerson = (id?: string) => (id ? brain.data.people.find((p) => p.id === id) : undefined);
  const selected = TOOLS.find((t) => t.id === selectedId) || null;
  const owner = selected ? findPerson((selected as any).owner_id || (selected.owners?.[0])) : null;

  return (
    <div className="flex h-dvh">
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="mb-6">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
              Brain Explorer
            </div>
            <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
              Sistemas y herramientas
            </h1>
            <p className="mt-2 text-stone-600">
              {brain.loading
                ? "Cargando…"
                : `${TOOLS.length} sistemas detectados a partir de las entrevistas + documentos${
                    brain.data.source === "live" ? "" : " (mock)"
                  }.`}
            </p>
          </header>

          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/60 text-[11px] uppercase tracking-wider text-stone-500">
                  <th className="text-left font-medium px-4 py-2.5 w-10"></th>
                  <th className="text-left font-medium px-4 py-2.5">Sistema</th>
                  <th className="text-left font-medium px-4 py-2.5">Categoría</th>
                  <th className="text-left font-medium px-4 py-2.5">Dueño</th>
                  <th className="text-left font-medium px-4 py-2.5">SLA acceso</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((t) => {
                  const ownerPerson = findPerson((t as any).owner_id || t.owners?.[0]);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                      className={cn(
                        "border-b border-stone-100 last:border-b-0 cursor-pointer hover:bg-stone-50 transition-colors",
                        selectedId === t.id && "bg-accent-50/40"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="h-7 w-7 rounded-md bg-stone-100 flex items-center justify-center">
                          <Wrench className="h-3.5 w-3.5 text-stone-600" strokeWidth={1.5} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">{t.name}</div>
                        <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                          {t.purpose}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] !py-0">
                          {t.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {ownerPerson ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={ownerPerson.name} size="sm" />
                            <span className="text-stone-700">
                              {ownerPerson.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-mono text-xs">
                        {t.sla}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && owner && (
        <aside className="w-96 border-l border-stone-200 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-3 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
              Detalle del sistema
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-stone-400 hover:text-stone-700 text-sm"
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <div className="font-medium text-stone-900 text-lg">{selected.name}</div>
              <Badge variant="outline" className="mt-1.5 text-[10px] !py-0">
                {selected.category}
              </Badge>
              <p className="text-sm text-stone-600 mt-3 leading-relaxed">
                {selected.purpose}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                Dueño
              </div>
              <div className="rounded-md border border-stone-200 bg-stone-50/40 p-3 flex items-start gap-3">
                <Avatar name={owner.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-stone-900">{owner.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {owner.role} · {owner.area}
                  </div>
                  {owner.email && (
                    <a
                      href={`mailto:${owner.email}`}
                      className="text-[11px] text-stone-600 hover:text-accent-600 font-mono mt-1.5 inline-flex items-center gap-1"
                    >
                      <Mail className="h-2.5 w-2.5" />
                      {owner.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                Cómo conseguir acceso
              </div>
              <div className="rounded-md border border-stone-200 bg-stone-50/40 p-3 text-sm text-stone-700">
                {selected.access_path}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-stone-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-stone-500">
                  SLA
                </div>
                <div className="text-sm font-medium text-stone-900 mt-0.5">
                  {selected.sla}
                </div>
              </div>
              <div className="rounded-md border border-stone-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-stone-500">
                  Áreas
                </div>
                <div className="text-sm font-medium text-stone-900 mt-0.5 line-clamp-1">
                  {selected.used_by_areas.join(", ")}
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full">
              Ver auditoría de accesos
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}
