export default function ToolsPage() {
  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          Brain Explorer
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Sistemas y herramientas
        </h1>
        <p className="mt-2 text-stone-600">
          23 sistemas detectados a partir de las entrevistas: Salesforce, SharePoint,
          Veraz, Score BIND, Slack, Google Workspace, AWS, JIRA, Notion, y más.
        </p>
      </header>
      <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-stone-500 text-sm">
        Tabla de tools — en construcción para V1.5. <br />
        En el demo de YC mostramos esto como tabla simple si llega el tiempo.
      </div>
    </div>
  );
}
