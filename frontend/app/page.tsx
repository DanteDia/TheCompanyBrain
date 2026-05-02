import Link from "next/link";
import { ArrowRight, MessageSquare, Network, Mic } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 py-8">
      <section className="space-y-4">
        <div className="text-xs uppercase tracking-wide text-accent">
          YC Summer 2026 · MVP
        </div>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          La empresa sabe más de lo que tiene escrito.
        </h1>
        <p className="text-lg leading-relaxed text-ink-600">
          Company Brain entrevista a cada empleado durante 7 minutos y arma el
          mapa real de cómo funciona la empresa — incluyendo las reglas que
          nadie escribe pero todos saben.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            href="/ask"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-dark"
          >
            Probá el Brain
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/interviews"
            className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-700 transition-all hover:border-accent hover:text-accent"
          >
            Ver cobertura
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card
          icon={<Mic className="h-5 w-5" />}
          title="1 · Entrevistamos"
          body="El agente de voz llama a cada empleado y le hace 13 preguntas en 7 minutos. Nadie tiene que escribir nada."
        />
        <Card
          icon={<Network className="h-5 w-5" />}
          title="2 · Construimos el grafo"
          body="Personas, herramientas, accesos, procesos, reglas no escritas — todo con citation textual a la entrevista."
        />
        <Card
          icon={<MessageSquare className="h-5 w-5" />}
          title="3 · Respondemos"
          body="Cualquier empleado pregunta en lenguaje natural y obtiene la persona, el contacto y el procedimiento — en segundos."
        />
      </section>
    </div>
  );
}

function Card({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-ink-200 bg-white p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-ink-50 text-accent">
        {icon}
      </div>
      <h3 className="font-semibold text-ink-900">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-600">{body}</p>
    </div>
  );
}
