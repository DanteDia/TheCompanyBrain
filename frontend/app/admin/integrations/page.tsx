import { IntegrationCard } from "@/components/integration-card";
import { INTEGRATIONS } from "@/lib/mock-data";

export default function IntegrationsPage() {
  const channels = INTEGRATIONS.filter((i) => i.category === "channel");
  const sources = INTEGRATIONS.filter((i) => i.category === "source");
  const identity = INTEGRATIONS.filter((i) => i.category === "identity");

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          Integraciones
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Conectores
        </h1>
        <p className="mt-2 text-stone-600 max-w-2xl">
          El Brain plays nice con tu ecosistema. Conectá donde la gente ya pregunta
          (channels), where knowledge comes from (sources) and how authentication is handled
          (identity).
        </p>
      </header>

      <Section
        title="Canales"
        subtitle="Donde tus empleados le hablan al Brain"
        items={channels}
      />
      <Section
        title="Fuentes de conocimiento"
        subtitle="Where the Brain's knowledge comes from"
        items={sources}
      />
      <Section
        title="Identidad y SSO"
        subtitle="Cómo se autentican tus usuarios"
        items={identity}
      />
    </div>
  );
}

function Section({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: typeof INTEGRATIONS;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-stone-900">{title}</h2>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((i) => (
          <IntegrationCard key={i.id} integration={i} />
        ))}
      </div>
    </section>
  );
}
