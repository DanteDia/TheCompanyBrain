"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { getInterviews, ApiError } from "@/lib/api";
import type { InterviewsResponse } from "@/lib/types";

export default function InterviewsPage() {
  const [data, setData] = useState<InterviewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInterviews()
      .then(setData)
      .catch((err) => {
        const msg =
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : err instanceof Error
              ? err.message
              : "Error";
        setError(msg);
      });
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
      </div>
    );
  }

  const { interviews, coverage } = data;
  const pct = coverage.total_employees
    ? Math.round((coverage.interviewed / coverage.total_employees) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Entrevistas</h1>
        <p className="text-ink-600">
          Cobertura de la organización a medida que el agente entrevista a cada empleado.
        </p>
      </header>

      <section className="rounded-xl border border-ink-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Cobertura
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-ink-900">
              {coverage.interviewed} <span className="text-ink-400">/ {coverage.total_employees}</span>
            </div>
          </div>
          <div className="text-2xl font-semibold tabular-nums text-accent">{pct}%</div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-500">
          Llamadas
        </h2>
        {interviews.length === 0 ? (
          <p className="text-sm text-ink-500">Todavía no hay entrevistas.</p>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 bg-white">
            {interviews.map((it) => (
              <li key={it.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <StatusIcon status={it.status} />
                  <div>
                    <div className="text-sm font-medium text-ink-900">{it.employee_id}</div>
                    <div className="text-xs text-ink-500">
                      {it.completed_at
                        ? new Date(it.completed_at).toLocaleString("es-AR")
                        : "—"}
                      {it.duration_sec ? ` · ${Math.round(it.duration_sec)}s` : ""}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-ink-400">{it.id.slice(-8)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "failed")
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  return <Clock className="h-5 w-5 text-ink-400" />;
}
