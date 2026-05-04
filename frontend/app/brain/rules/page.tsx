"use client";

import { Lightbulb, Quote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useBrain } from "@/lib/use-brain";

export default function RulesPage() {
  const brain = useBrain();
  const RULES = brain.data.informal_rules;
  const findPerson = (id?: string) =>
    id ? brain.data.people.find((p) => p.id === id) : undefined;

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-accent-600 font-medium">
          Brain Explorer · El moat
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Unwritten rules
        </h1>
        <p className="mt-2 text-stone-600 max-w-2xl">
          {brain.loading
            ? "Cargando…"
            : `${RULES.length} reglas tribales capturadas de las entrevistas. Cosas que nadie escribió en Confluence pero que todos saben.`}
        </p>
      </header>

      {!brain.loading && RULES.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center">
          <Lightbulb className="h-10 w-10 mx-auto text-stone-300 mb-3" strokeWidth={1.5} />
          <div className="text-stone-700 font-medium">No rules yet</div>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            Subí entrevistas y procesalas en /admin/upload — las reglas aparecen acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {RULES.map((r, i) => {
            const sources = (r.learned_from || [])
              .map((id) => findPerson(id))
              .filter(Boolean);
            return (
              <Card key={r.id || i} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-accent-50 text-accent-700 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-4 w-4" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-900 leading-relaxed">{r.description}</p>
                    {r.context && (
                      <p className="text-sm text-stone-500 mt-1.5 italic">
                        Contexto: {r.context}
                      </p>
                    )}
                    {sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sources.map((p) =>
                          p ? (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700"
                            >
                              <Quote className="h-2.5 w-2.5" strokeWidth={2} />
                              {p.name}
                            </span>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
