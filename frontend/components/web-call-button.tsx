"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startWebCall, ApiError } from "@/lib/api-backend";

interface Props {
  employee_id: string;
  organization_id?: string;
  variant?: "outline" | "default" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

type Phase = "idle" | "starting" | "live" | "ending";

// We import the Retell SDK lazily on click so we don't bloat the initial bundle
// for visitors who never start a call.
async function loadRetell() {
  const mod = await import("retell-client-js-sdk");
  return mod.RetellWebClient;
}

export function WebCallButton({
  employee_id,
  organization_id,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const clientRef = useRef<{ stopCall: () => void } | null>(null);

  useEffect(() => {
    return () => {
      // cleanup on unmount — kill any active call
      try {
        clientRef.current?.stopCall();
      } catch {
        /* ignore */
      }
    };
  }, []);

  async function handleStart() {
    setPhase("starting");
    setErr(null);
    setTranscript([]);
    try {
      const RetellWebClient = await loadRetell();
      const r = await startWebCall(employee_id, organization_id);
      const client = new RetellWebClient();
      clientRef.current = client;

      client.on("call_started", () => setPhase("live"));
      client.on("call_ended", () => {
        setPhase("idle");
        clientRef.current = null;
      });
      client.on("error", (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
        setPhase("idle");
        clientRef.current = null;
      });
      // Live transcript stream — Retell pushes incremental updates
      client.on(
        "update",
        (u: { transcript?: Array<{ role: string; content: string }> }) => {
          if (u.transcript) {
            setTranscript(
              u.transcript.map((t) => `${t.role}: ${t.content}`)
            );
          }
        }
      );

      await client.startCall({ accessToken: r.access_token });
    } catch (e) {
      const msg = e instanceof ApiError ? `${e.status} — ${e.message}` : (e as Error).message;
      setErr(msg);
      setPhase("idle");
    }
  }

  async function handleStop() {
    setPhase("ending");
    try {
      clientRef.current?.stopCall();
    } finally {
      clientRef.current = null;
      setPhase("idle");
    }
  }

  if (phase === "live" || phase === "ending") {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-stone-200 bg-white shadow-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            Entrevista en curso
          </div>
          <button onClick={handleStop} className="text-stone-500 hover:text-stone-900">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 max-h-48 overflow-y-auto text-xs text-stone-600 space-y-1">
          {transcript.slice(-8).map((line, i) => (
            <div key={i} className="leading-relaxed">{line}</div>
          ))}
          {transcript.length === 0 && (
            <div className="italic text-stone-400">Esperando respuesta del agente…</div>
          )}
        </div>
        <Button onClick={handleStop} variant="outline" size="sm" className="mt-3 w-full h-7 text-xs">
          <MicOff className="h-3 w-3" />
          Terminar entrevista
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button variant={variant} size={size} className="h-7 text-xs" onClick={handleStart} disabled={phase === "starting"}>
        {phase === "starting" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
        Entrevista en vivo
      </Button>
      {err && <div className="mt-1 text-[10px] text-red-700">{err}</div>}
    </div>
  );
}
