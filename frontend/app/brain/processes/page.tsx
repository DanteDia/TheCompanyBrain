"use client";

import { useState } from "react";
import { Workflow, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBrain } from "@/lib/use-brain";
import { cn } from "@/lib/utils";

export default function ProcessesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const brain = useBrain();
  const PROCESSES = brain.data.processes;
  const findPerson = (id?: string) => (id ? brain.data.people.find((p) => p.id === id) : undefined);
  const selected = PROCESSES.find((p) => p.id === selectedId) || null;
  const owner = selected ? findPerson(selected.owner_id) : null;

  return (
    <div className="flex h-dvh">
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="mb-6">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
              Brain Explorer
            </div>
            <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
              Processes
            </h1>
            <p className="mt-2 text-stone-600">
              {brain.loading
                ? "Cargando…"
                : `${PROCESSES.length} procesos operativos extraídos de las entrevistas y documentos${
                    brain.data.source === "live" ? "" : " (mock)"
                  }.`}
            </p>
          </header>

          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/60 text-[11px] uppercase tracking-wider text-stone-500">
                  <th className="text-left font-medium px-4 py-2.5 w-10"></th>
                  <th className="text-left font-medium px-4 py-2.5">Proceso</th>
                  <th className="text-left font-medium px-4 py-2.5">Area</th>
                  <th className="text-left font-medium px-4 py-2.5">Owner</th>
                  <th className="text-center font-medium px-4 py-2.5">Steps</th>
                  <th className="text-left font-medium px-4 py-2.5">SLA</th>
                </tr>
              </thead>
              <tbody>
                {PROCESSES.map((p) => {
                  const ownerPerson = findPerson(p.owner_id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                      className={cn(
                        "border-b border-stone-100 last:border-b-0 cursor-pointer hover:bg-stone-50 transition-colors",
                        selectedId === p.id && "bg-accent-50/40"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="h-7 w-7 rounded-md bg-stone-100 flex items-center justify-center">
                          <Workflow className="h-3.5 w-3.5 text-stone-600" strokeWidth={1.5} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">{p.name}</div>
                        <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                          {p.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] !py-0">
                          {p.area}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {ownerPerson ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={ownerPerson.name} size="sm" />
                            <span className="text-stone-700">{ownerPerson.name}</span>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-stone-700">
                        {p.steps}
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-mono text-xs">
                        {p.sla}
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
              Detalle del proceso
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
                {selected.area}
              </Badge>
              <p className="text-sm text-stone-600 mt-3 leading-relaxed">
                {selected.description}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                Owner / Referente
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

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-stone-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-stone-500">
                  Steps
                </div>
                <div className="text-sm font-medium text-stone-900 mt-0.5 font-mono">
                  {selected.steps}
                </div>
              </div>
              <div className="rounded-md border border-stone-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-stone-500">
                  SLA
                </div>
                <div className="text-sm font-medium text-stone-900 mt-0.5">
                  {selected.sla}
                </div>
              </div>
            </div>

            {selected.participants.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                  Participants
                </div>
                <div className="space-y-1.5">
                  {selected.participants.map((id) => {
                    const p = findPerson(id);
                    if (!p) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 rounded-md bg-stone-50/60 px-2 py-1.5"
                      >
                        <Avatar name={p.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-stone-900 truncate">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-stone-500 truncate">
                            {p.role}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full">
              Ver historial de ejecuciones
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}
