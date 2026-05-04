"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useBrain } from "@/lib/use-brain";
import { cn } from "@/lib/utils";
import { PersonCard } from "@/components/person-card";

export default function PeoplePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const brain = useBrain();
  const PEOPLE = brain.data.people;

  return (
    <div className="flex h-dvh">
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="mb-6">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
              Brain Explorer
            </div>
            <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
              People
            </h1>
            <p className="mt-2 text-stone-600">
              {brain.loading
                ? "Cargando…"
                : `${PEOPLE.length} empleados${
                    brain.data.source === "live" ? "" : " (mock)"
                  } · ${
                    PEOPLE.filter((p) => p.interviewed).length
                  } interviewed`}
            </p>
          </header>

          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/60 text-[11px] uppercase tracking-wider text-stone-500">
                  <th className="text-left font-medium px-4 py-2.5 w-10"></th>
                  <th className="text-left font-medium px-4 py-2.5">Nombre</th>
                  <th className="text-left font-medium px-4 py-2.5">Rol</th>
                  <th className="text-left font-medium px-4 py-2.5">Área</th>
                  <th className="text-center font-medium px-4 py-2.5">Entrevista</th>
                  <th className="text-left font-medium px-4 py-2.5">Expertise</th>
                </tr>
              </thead>
              <tbody>
                {PEOPLE.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p.id === selected ? null : p.id)}
                    className={cn(
                      "border-b border-stone-100 last:border-b-0 cursor-pointer hover:bg-stone-50 transition-colors",
                      selected === p.id && "bg-accent-50/40"
                    )}
                  >
                    <td className="px-4 py-3">
                      <Avatar name={p.name} size="sm" />
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-900">{p.name}</td>
                    <td className="px-4 py-3 text-stone-700">{p.role}</td>
                    <td className="px-4 py-3 text-stone-600">{p.area}</td>
                    <td className="px-4 py-3 text-center">
                      {p.interviewed ? (
                        <Badge variant="success" className="text-[10px] !py-0">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] !py-0">
                          —
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.expertise_areas?.slice(0, 2).map((e) => (
                          <span
                            key={e}
                            className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600"
                          >
                            {e}
                          </span>
                        ))}
                        {(p.expertise_areas?.length || 0) > 2 && (
                          <span className="text-[10px] text-stone-400">
                            +{(p.expertise_areas?.length || 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer derecho */}
      {selected && (
        <aside className="w-96 border-l border-stone-200 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-3 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
              Detalle
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-stone-400 hover:text-stone-700 text-sm"
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="p-5">
            <PersonCard id={selected} />
            <div className="mt-4 text-xs text-stone-500 italic">
              To view the full interview transcript, open{" "}
              <span className="font-mono text-stone-700">/admin/interviews</span>.
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
