"use client";

import { useState } from "react";
import { Upload, FileText, Check, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PEOPLE } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const [step, setStep] = useState<"upload" | "preview" | "scheduling">("upload");
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          Discovery
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Cargar datos al Brain
        </h1>
        <p className="mt-2 text-stone-600 max-w-2xl">
          Cargá cualquier tipo de documento con el que quieras alimentar tu Company
          Brain. PDFs, Word, Excel, slides, CSVs, transcripts — el Brain los analiza,
          los integra al grafo de conocimiento y los deja consultables en segundos.
        </p>
      </header>

      {step === "upload" && (
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
            setStep("preview");
          }}
          onClick={() => setStep("preview")}
          className={cn(
            "rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
            dragOver
              ? "border-accent-500 bg-accent-50/40"
              : "border-stone-300 bg-white hover:border-stone-400"
          )}
        >
          <Upload className="h-10 w-10 mx-auto text-stone-400 mb-4" strokeWidth={1.5} />
          <div className="text-lg font-medium text-stone-900">
            Arrastrá cualquier documento acá
          </div>
          <div className="text-sm text-stone-500 mt-1">
            PDF · Word · Excel · CSV · slides · transcripts · cualquier formato
          </div>
          <Button variant="outline" className="mt-6">
            <FileText className="h-4 w-4" />
            Seleccionar archivo
          </Button>
          <div className="mt-8 text-xs text-stone-400 font-mono">
            Demo · clickeá para simular carga al Brain de BIND Bank
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-stone-900 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-700" strokeWidth={2.5} />
                  bind_org_chart_v1.csv cargado
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {PEOPLE.length} empleados detectados · 4 áreas · 1 CEO
                </div>
              </div>
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
                  {PEOPLE.slice(0, 5).map((p) => (
                    <tr key={p.id} className="border-b border-stone-100 last:border-b-0">
                      <td className="px-3 py-2 flex items-center gap-2">
                        <Avatar name={p.name} size="sm" />
                        {p.name}
                      </td>
                      <td className="px-3 py-2 text-stone-600">{p.role}</td>
                      <td className="px-3 py-2 text-stone-600">{p.area}</td>
                      <td className="px-3 py-2 font-mono text-xs text-stone-500">
                        {p.email}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-xs text-stone-400 italic">
                      …y {PEOPLE.length - 5} más
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5 bg-accent-50/40 border-accent-200">
            <div className="text-sm font-medium text-stone-900 mb-2">
              Próximo paso: agendar entrevistas
            </div>
            <p className="text-sm text-stone-600 mb-4">
              Vamos a mandar invitaciones de Google Calendar a cada empleado con un slot
              de 7 minutos. Cada llamada la conduce un agente de voz que extrae cómo
              trabajan.
            </p>
            <Button onClick={() => setStep("scheduling")}>
              Iniciar agendamiento <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}

      {step === "scheduling" && (
        <Card className="p-8 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 mb-4">
            <Check className="h-6 w-6 text-green-700" strokeWidth={2} />
          </div>
          <div className="text-lg font-medium text-stone-900">
            Invitaciones enviadas
          </div>
          <p className="text-sm text-stone-600 mt-1">
            {PEOPLE.length} empleados recibieron una invitación de Google Calendar.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 max-w-md mx-auto text-sm">
            <div className="rounded-md border border-stone-200 p-3">
              <div className="text-2xl font-medium font-mono text-stone-900">
                {PEOPLE.length}
              </div>
              <div className="text-xs text-stone-500">enviadas</div>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <div className="text-2xl font-medium font-mono text-stone-900">5</div>
              <div className="text-xs text-stone-500">confirmadas</div>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <div className="text-2xl font-medium font-mono text-stone-900">7</div>
              <div className="text-xs text-stone-500">pendientes</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
