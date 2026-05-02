import { Card } from "@/components/ui/card";

const TERMS = [
  {
    term: "Score BIND",
    definition:
      "Score crediticio interno de BIND. Fórmula: (Veraz × 0.6) + (Antigüedad meses × 0.3) + (Saldo promedio × 0.1).",
  },
  {
    term: "BCRA",
    definition:
      "Banco Central de la República Argentina. Regulador del sistema financiero argentino.",
  },
  {
    term: "DTI",
    definition:
      "Debt-to-income ratio. Porcentaje del ingreso del cliente comprometido en deudas.",
  },
  {
    term: "LTV",
    definition: "Loan-to-value. Ratio entre el monto del préstamo y el valor de la garantía.",
  },
  {
    term: "Cliente Premium",
    definition:
      "Cliente con producto BIND Premium activo o saldo promedio > $2M en últimos 6 meses.",
  },
  {
    term: "Comité de Crédito",
    definition:
      "Aprueba operaciones > $5M. Se reúne martes y jueves 14:00hs. Lo integran VP Riesgo + Gerente de Créditos + 2 directores.",
  },
];

export default function GlossaryPage() {
  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          Brain Explorer
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Glosario
        </h1>
        <p className="mt-2 text-stone-600">
          Términos internos de BIND extraídos de las entrevistas. Lo que un empleado
          nuevo necesita entender desde el día 1.
        </p>
      </header>

      <div className="space-y-3">
        {TERMS.map((t) => (
          <Card key={t.term} className="p-4">
            <div className="font-medium text-stone-900">{t.term}</div>
            <p className="text-sm text-stone-600 mt-1 leading-relaxed">{t.definition}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
