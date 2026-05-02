"use client";

import { useState } from "react";
import { Quote } from "lucide-react";
import type { Citation } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  citations: Citation[];
  className?: string;
}

export function ProvenanceTooltip({ citations, className }: Props) {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;

  return (
    <div className={cn("rounded-lg border border-ink-200 bg-white", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-ink-700 transition-colors hover:bg-ink-50"
      >
        <span className="flex items-center gap-2">
          <Quote className="h-4 w-4 text-accent" />
          {citations.length} cita{citations.length === 1 ? "" : "s"} de la base de conocimiento
        </span>
        <span className="text-xs text-ink-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="divide-y divide-ink-100 border-t border-ink-100 px-4 py-2">
          {citations.map((c, i) => (
            <li key={`${c.entity_id}-${i}`} className="py-3 text-sm">
              <div className="text-ink-600">
                <span className="font-mono text-xs text-ink-400">
                  {c.entity_type}/{c.entity_id}
                </span>
              </div>
              <p className="mt-1 italic text-ink-800">"{c.quote}"</p>
              <div className="mt-1 text-xs text-ink-500">
                {c.source_type === "interview" ? "Entrevista" : "Org chart"}
                {c.speaker ? ` · ${c.speaker}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
