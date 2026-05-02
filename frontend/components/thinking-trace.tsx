"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThinkingTraceProps {
  steps?: string[];
  active?: boolean;
}

const DEFAULT_STEPS = [
  "Analizando la pregunta",
  "Buscando entidades relevantes en el Brain",
  "Consultando entrevistas pertinentes",
  "Conectando con el organigrama",
  "Verificando citations",
];

export function ThinkingTrace({ steps = DEFAULT_STEPS, active = false }: ThinkingTraceProps) {
  const [open, setOpen] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisibleSteps(steps.length);
      return;
    }
    setVisibleSteps(0);
    const interval = setInterval(() => {
      setVisibleSteps((s) => {
        if (s >= steps.length) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [active, steps.length]);

  if (active) {
    return (
      <div className="flex items-start gap-3 py-2">
        <Sparkles className="h-4 w-4 text-accent-500 animate-pulse-soft flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          {steps.slice(0, visibleSteps).map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "text-sm italic",
                i === visibleSteps - 1 ? "text-stone-700" : "text-stone-400"
              )}
            >
              {step}
              {i === visibleSteps - 1 && "…"}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-accent-200 pl-4 my-3">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-500 hover:text-stone-700 transition-colors py-1"
      >
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
        Razonamiento del agente · {steps.length} pasos
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
            <div className="py-2 space-y-1">
              {steps.map((step, i) => (
                <div key={i} className="text-sm text-stone-600 italic">
                  <span className="text-stone-400 font-mono mr-2">{String(i + 1).padStart(2, "0")}</span>
                  {step}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
