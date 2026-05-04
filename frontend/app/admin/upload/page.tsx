"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Check, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { uploadOrgChart, schedule, ApiError } from "@/lib/api-backend";
import type { Person } from "@/lib/types-backend";
import { cn } from "@/lib/utils";

interface UploadResult {
  ok: boolean;
  people_loaded: number;
  total_in_brain: number;
  preview: Person[];
}

export default function UploadPage() {
  const [step, setStep] = useState<"upload" | "preview" | "scheduling" | "done">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [scheduled, setScheduled] = useState<{ count: number; meet_links: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orgId, setOrgId] = useState("banco_demo");

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("File must be .csv");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const r = await uploadOrgChart(file, orgId);
      // After upload, fetch the people list to render preview
      const skillsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/skills-file?organization_id=${encodeURIComponent(orgId)}`,
        { cache: "no-store" }
      );
      const sf = await skillsRes.json();
      setResult({
        ok: r.ok,
        people_loaded: r.people_loaded,
        total_in_brain: r.total_in_brain,
        preview: (sf.people || []).slice(0, 8),
      });
      setStep("preview");
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status} — ${e.message}` : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule() {
    setLoading(true);
    setError(null);
    try {
      const r = await schedule(orgId);
      setScheduled({
        count: (r.scheduled || []).length,
        meet_links: (r.scheduled || []).map((s: { meet_link?: string }) => s.meet_link).filter((u): u is string => Boolean(u)),
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status} — ${e.message}` : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
            Discovery
          </div>
          <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
            Subir organigrama
          </h1>
          <p className="mt-2 text-stone-600 max-w-2xl">
            Cargá un CSV con la lista de empleados. Después agendamos
            entrevistas con Google Calendar y un agente de voz extrae cómo trabajan.
          </p>
        </div>
        <div className="text-right">
          <label className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
            Organization id
          </label>
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="mt-1 block rounded-md border border-stone-200 px-2 py-1 text-sm font-mono"
          />
        </div>
      </header>

      {error && (
        <Card className="p-4 mb-4 bg-red-50 border-red-200 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        </Card>
      )}

      {step === "upload" && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div
            onDragEnter={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
              dragOver
                ? "border-accent-500 bg-accent-50/40"
                : "border-stone-300 bg-white hover:border-stone-400"
            )}
          >
            {loading ? (
              <Loader2 className="h-10 w-10 mx-auto text-stone-400 mb-4 animate-spin" />
            ) : (
              <Upload className="h-10 w-10 mx-auto text-stone-400 mb-4" strokeWidth={1.5} />
            )}
            <div className="text-lg font-medium text-stone-900">
              {loading ? "Subiendo y procesando…" : "Arrastrá tu organigrama acá"}
            </div>
            <div className="text-sm text-stone-500 mt-1">
              CSV con columnas: <span className="font-mono">id, name, email, role, area, manager_id, phone</span>
            </div>
            <Button variant="outline" className="mt-6" disabled={loading}>
              <FileText className="h-4 w-4" />
              Seleccionar archivo
            </Button>
            <div className="mt-8 text-xs text-stone-400 font-mono">
              Real upload to backend · org_id = {orgId}
            </div>
          </div>
        </>
      )}

      {step === "preview" && result && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-stone-900 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-700" strokeWidth={2.5} />
                  CSV cargado y procesado
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {result.people_loaded} empleados cargados ·{" "}
                  {result.total_in_brain} ya en el Brain (incluye merges)
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setResult(null); }}>
                Subir otro CSV
              </Button>
            </div>

            <div className="rounded-lg border border-stone-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                    <th className="text-left font-medium px-3 py-2">Nombre</th>
                    <th className="text-left font-medium px-3 py-2">Rol</th>
                    <th className="text-left font-medium px-3 py-2">Área</th>
                    <th className="text-left font-medium px-3 py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100 last:border-b-0">
                      <td className="px-3 py-2 flex items-center gap-2">
                        <Avatar name={p.name} size="sm" />
                        {p.name}
                      </td>
                      <td className="px-3 py-2 text-stone-600">{p.role || "—"}</td>
                      <td className="px-3 py-2 text-stone-600">{p.area || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-stone-500">
                        {p.email || "—"}
                      </td>
                    </tr>
                  ))}
                  {result.total_in_brain > result.preview.length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-xs text-stone-400 italic">
                        …y {result.total_in_brain - result.preview.length} más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5 bg-accent-50/40 border-accent-200">
            <div className="text-sm font-medium text-stone-900 mb-2">
              Próximo paso: agendar entrevistas
            </div>
            <p className="text-sm text-stone-600 mb-4">
              Mandamos una invitación de Google Calendar (con Meet auto-generado) a
              cada empleado, distribuyéndolas en slots de 15 min de Lunes a Viernes 9-18.
              Cada llamada la conduce un agente de voz Retell que les hace 13 preguntas
              en ~7 minutos.
            </p>
            <p className="text-xs text-stone-500 italic mb-4">
              Nota V1: hoy distribuimos en slots cronológicos. La integración para
              consultar availability de cada empleado vía Calendar freebusy queda V1.5.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleSchedule} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Iniciar agendamiento
              </Button>
              <Button variant="outline" disabled={loading} onClick={() => setStep("upload")}>
                Saltear (probar Q&A directo)
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === "done" && scheduled && (
        <Card className="p-8 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 mb-4">
            <Check className="h-6 w-6 text-green-700" strokeWidth={2} />
          </div>
          <div className="text-lg font-medium text-stone-900">
            {scheduled.count} invitaciones enviadas
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Cada empleado recibió un Google Calendar invite con link a Meet.
          </p>

          {scheduled.meet_links.length > 0 && (
            <details className="mt-4 text-left max-w-lg mx-auto">
              <summary className="text-xs uppercase tracking-wider text-stone-500 cursor-pointer">
                Meet links
              </summary>
              <ul className="mt-2 space-y-1 text-xs font-mono text-stone-600">
                {scheduled.meet_links.slice(0, 5).map((url, i) => (
                  <li key={i}>
                    <a className="underline" href={url} target="_blank" rel="noopener noreferrer">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-6">
            <Button variant="outline" onClick={() => { setStep("upload"); setScheduled(null); setResult(null); }}>
              Subir otra empresa
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
