"use client";

import { useState } from "react";
import { ChevronDown, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/types";

export function Citations({
  citations,
  isAdmin,
}: {
  citations: Citation[];
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!isAdmin || citations.length === 0) return null;

  return (
    <div className="border-t border-stone-200 mt-4 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
        Citas y fuentes · {citations.length}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-3">
              {citations.map((c, i) => (
                <div
                  key={i}
                  className="rounded-md border border-stone-200 bg-stone-50 p-3 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <Quote className="h-3 w-3 text-stone-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-stone-600 italic font-mono leading-relaxed">
                        "{c.evidence.quote}"
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2 text-[11px] text-stone-500">
                        <span className="font-medium">
                          {c.evidence.source_type === "interview"
                            ? `Entrevista · ${c.evidence.speaker}`
                            : c.evidence.source_type === "org_chart"
                            ? "Organigrama"
                            : "Documento"}
                        </span>
                        {c.evidence.timestamp_seconds !== undefined && (
                          <span className="font-mono">
                            · {formatTimestamp(c.evidence.timestamp_seconds)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
