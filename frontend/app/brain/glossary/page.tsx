"use client";

import { Card } from "@/components/ui/card";
import { useBrain } from "@/lib/use-brain";

// Hardcoded terms used as fallback when the brain has no glossary yet.
// Once the extractor mines glossary terms from interviews, the live values
// supersede these.
const FALLBACK_TERMS: Array<{ term: string; definition: string }> = [
  {
    term: "Score Blur",
    definition:
      "Internal credit score. Formula: (Veraz × 0.6) + (Age months × 0.3) + (Average balance × 0.1).",
  },
  {
    term: "BCRA",
    definition:
      "Central Bank of the Argentine Republic. Regulator of the Argentine financial system.",
  },
  {
    term: "DTI",
    definition:
      "Debt-to-income ratio. Porcentaje del ingreso del cliente comprometido en deudas.",
  },
  {
    term: "LTV",
    definition: "Loan-to-value. Percentage of asset value covered by the loan.",
  },
  {
    term: "PLAFT",
    definition: "Anti-Money Laundering and Counter-Terrorist Financing prevention.",
  },
];

export default function GlossaryPage() {
  const brain = useBrain();
  const liveTerms = brain.data.glossary.map((g) => ({
    term: g.term,
    definition: g.definition,
  }));
  const TERMS = liveTerms.length > 0 ? liveTerms : FALLBACK_TERMS;
  const sourceLabel = liveTerms.length > 0 ? "live" : "fallback";

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          Brain Explorer
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Glossary interno
        </h1>
        <p className="mt-2 text-stone-600">
          {brain.loading
            ? "Cargando…"
            : `${TERMS.length} terms${
                sourceLabel === "fallback" ? " (fallback)" : ""
              } — siglas, productos, jerga interna.`}
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {TERMS.map((t) => (
          <Card key={t.term} className="p-5">
            <div className="text-base font-medium text-stone-900 mb-1.5 font-mono">
              {t.term}
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">{t.definition}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
