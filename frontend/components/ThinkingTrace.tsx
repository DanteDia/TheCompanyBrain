"use client";

import { useState } from "react";
import { Brain } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  trace?: string | null;
  className?: string;
}

export function ThinkingTrace({ trace, className }: Props) {
  const [open, setOpen] = useState(false);
  if (!trace) return null;

  return (
    <div className={cn("rounded-lg border border-ink-200 bg-ink-50/60", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-ink-600 transition-colors hover:bg-ink-100"
      >
        <span className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-ink-400" />
          Razonamiento del agente
        </span>
        <span className="text-xs text-ink-400">{open ? "ocultar" : "mostrar"}</span>
      </button>
      {open && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-ink-200 px-4 py-3 font-mono text-xs leading-relaxed text-ink-700">
          {trace}
        </pre>
      )}
    </div>
  );
}
