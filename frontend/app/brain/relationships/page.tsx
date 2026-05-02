import { Network } from "lucide-react";

export default function RelationshipsPage() {
  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          Brain Explorer
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Grafo de relaciones
        </h1>
        <p className="mt-2 text-stone-600">
          153 relaciones entre personas, sistemas y procesos. Cada edge tiene su evidencia.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-stone-300 p-16 text-center">
        <Network className="h-12 w-12 mx-auto text-stone-300 mb-3" strokeWidth={1.5} />
        <div className="text-stone-700 font-medium">Visualización del grafo</div>
        <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
          Force-directed layout con react-flow — V1.5. Cut del weekend de YC; mostrar como
          tabla en /brain/people si hace falta.
        </p>
      </div>
    </div>
  );
}
