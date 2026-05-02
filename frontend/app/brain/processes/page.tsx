export default function ProcessesPage() {
  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          Brain Explorer
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Procesos
        </h1>
        <p className="mt-2 text-stone-600">
          41 procesos operativos extraídos de entrevistas: onboarding de cliente,
          aprobación crediticia, gestión de reclamos, alta de usuario, refinanciación, etc.
        </p>
      </header>
      <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-stone-500 text-sm">
        Tabla de procesos — en construcción.
      </div>
    </div>
  );
}
