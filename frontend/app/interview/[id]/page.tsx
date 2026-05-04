"use client";

/**
 * Interview live page — what the employee sees after clicking the link in
 * their Calendar invite. Two screens: pre-call start screen and the live
 * call screen with the animated voice orb.
 *
 * Query params:
 *   - ?org=<id>   override organization_id (default: tcb_demo)
 *   - ?mock=1     skip the Retell SDK entirely and play the UI flow with
 *                 synthesized timing — useful for demo recordings and for
 *                 testing the visuals without burning API minutes.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { GradientSphere, type SpherePhase } from "@/components/gradient-sphere";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { startWebCall, ApiError } from "@/lib/api-backend";

type Phase = "ready" | "starting" | "live" | "ended" | "error";

interface RetellTranscriptEntry {
  role: string;
  content: string;
}

async function loadRetell() {
  const mod = await import("retell-client-js-sdk");
  return mod.RetellWebClient;
}

export default function InterviewPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const employeeId = params?.id ?? "";
  const orgId = search?.get("org") || "tcb_demo";
  const isMock = search?.get("mock") === "1";
  const theme: "light" | "dark" = search?.get("theme") === "light" ? "light" : "dark";
  const isLight = theme === "light";

  const [phase, setPhase] = useState<Phase>("ready");
  const [orbPhase, setSpherePhase] = useState<SpherePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<RetellTranscriptEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const clientRef = useRef<{ stopCall: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop =
        transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Cleanup
  useEffect(() => {
    return () => {
      try { clientRef.current?.stopCall(); } catch {}
      if (timerRef.current) clearInterval(timerRef.current);
      if (mockTimerRef.current) clearInterval(mockTimerRef.current);
    };
  }, []);

  function startTimer() {
    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function fmtTime(s: number) {
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // ─────────────────────── MOCK MODE ───────────────────────
  // Plays a synthetic call flow for testing the visuals.
  function startMockCall() {
    setPhase("starting");
    setSpherePhase("connecting");
    setTimeout(() => {
      setPhase("live");
      setSpherePhase("speaking");
      startTimer();
      // Add fake transcript entries on a timer
      const lines: Array<{ role: string; content: string; delayMs: number }> = [
        { role: "agent", content: "Hola, soy el agente de Company Brain. Te voy a hacer unas preguntas cortas — ¿estás listo?", delayMs: 1500 },
        { role: "user", content: "Sí, dale.", delayMs: 5500 },
        { role: "agent", content: "Perfecto. Para empezar, contame en una frase qué hacés en tu rol.", delayMs: 7000 },
        { role: "user", content: "Soy cofundador y manejo marketing y growth — sitio web, contenido, contacto con prospects.", delayMs: 12000 },
        { role: "agent", content: "Buenísimo. ¿Qué herramientas usás día a día?", delayMs: 14500 },
        { role: "user", content: "Notion para docs, Vercel para deployar la landing, Cal.com para booking, y Slack con el equipo.", delayMs: 19000 },
        { role: "agent", content: "Excelente. Si alguien necesita acceso a Vercel, ¿a quién le pide?", delayMs: 21500 },
        { role: "user", content: "Me lo pide a mí — soy el dueño del workspace.", delayMs: 25000 },
      ];
      lines.forEach((l) => {
        setTimeout(() => {
          setTranscript((cur) => [...cur, { role: l.role, content: l.content }]);
          // Toggle orb phase to mimic agent/user turns
          setSpherePhase(l.role === "agent" ? "speaking" : "listening");
        }, l.delayMs);
      });
    }, 1800);
  }

  // ─────────────────────── REAL CALL ───────────────────────
  async function startRealCall() {
    setPhase("starting");
    setSpherePhase("connecting");
    setError(null);
    try {
      const RetellWebClient = await loadRetell();
      const r = await startWebCall(employeeId, orgId);
      const client = new RetellWebClient();
      clientRef.current = client;

      client.on("call_started", () => {
        setPhase("live");
        setSpherePhase("listening");
        startTimer();
      });
      client.on("call_ended", () => {
        setPhase("ended");
        setSpherePhase("ended");
        stopTimer();
        clientRef.current = null;
      });
      client.on("error", (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setPhase("error");
        setSpherePhase("ended");
        stopTimer();
        clientRef.current = null;
      });
      // Agent talking — drive orb to speaking
      client.on("agent_start_talking", () => setSpherePhase("speaking"));
      client.on("agent_stop_talking", () => setSpherePhase("listening"));
      // Live transcript
      client.on(
        "update",
        (u: { transcript?: RetellTranscriptEntry[] }) => {
          if (u.transcript) setTranscript(u.transcript);
        }
      );
      // Audio level (if SDK exposes it; gracefully ignored otherwise)
      client.on("audio", (data: unknown) => {
        if (typeof data === "object" && data && "level" in (data as Record<string, unknown>)) {
          const lvl = (data as { level: number }).level;
          if (typeof lvl === "number") setAudioLevel(Math.max(0, Math.min(1, lvl)));
        }
      });

      await client.startCall({ accessToken: r.access_token });
    } catch (e) {
      const msg = e instanceof ApiError ? `${e.status} — ${e.message}` : (e as Error).message;
      setError(msg);
      setPhase("error");
      setSpherePhase("ended");
    }
  }

  function handleStart() {
    setTranscript([]);
    setElapsed(0);
    setAudioLevel(0);
    if (isMock) startMockCall();
    else startRealCall();
  }

  function handleEnd() {
    if (isMock) {
      setPhase("ended");
      setSpherePhase("ended");
      stopTimer();
      // Stop further mock transcript additions by clearing timeouts is unclean
      // here; but since each setTimeout fires independently, we accept harmless
      // late additions in mock mode.
      return;
    }
    try { clientRef.current?.stopCall(); } catch {}
    setPhase("ended");
    setSpherePhase("ended");
    stopTimer();
    clientRef.current = null;
  }

  // ─────────────────────── UI ───────────────────────
  const showStart = phase === "ready";
  const showLive = phase === "starting" || phase === "live";
  const showEnded = phase === "ended";
  const showError = phase === "error";

  const statusText: Record<Phase, string> = {
    ready: "Listo para empezar",
    starting: "Conectando…",
    live:
      orbPhase === "speaking"
        ? "El agente está hablando"
        : orbPhase === "listening"
        ? "Te escucho — hablá libremente"
        : "En vivo",
    ended: "Entrevista terminada",
    error: "Algo falló",
  };

  return (
    <div className={cn(
      "relative h-dvh w-full overflow-hidden",
      isLight ? "bg-stone-50 text-stone-900" : "bg-[#0a0807] text-stone-100"
    )}>
      {/* Ambient backdrop */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: isLight
              ? "radial-gradient(ellipse 90% 70% at 50% 40%, rgba(254,243,226,1) 0%, rgba(250,238,222,0.6) 40%, rgba(245,245,244,0) 75%)"
              : "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(120,55,25,0.25) 0%, rgba(40,20,10,0.4) 40%, rgba(10,8,7,1) 75%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: isLight
              ? "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,169,97,0.18) 0%, transparent 60%)"
              : "radial-gradient(ellipse 120% 50% at 50% 110%, rgba(0,0,0,0.25) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 py-5">
        <Logo variant={isLight ? "default" : "inverted"} priority />
        {phase === "live" && (
          <div className={cn(
              "flex items-center gap-2 rounded-full backdrop-blur-sm px-3 py-1 text-xs font-mono shadow-sm",
              isLight
                ? "border border-stone-200 bg-white/80 text-stone-700"
                : "border border-stone-700/50 bg-stone-900/70 text-stone-300"
            )}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            REC · {fmtTime(elapsed)}
          </div>
        )}
        {isMock && phase !== "live" && (
          <div className={cn(
              "rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider",
              isLight
                ? "border border-amber-200 bg-amber-50 text-amber-700"
                : "border border-amber-700/40 bg-amber-950/40 text-amber-300"
            )}>
            Mock mode — visualización sin call real
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="relative z-0 flex h-full flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {showStart && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <GradientSphere phase="idle" size={360} theme={theme} />
              <div className="mt-12 max-w-md">
                <div className={cn(
                  "text-[11px] uppercase tracking-wider font-medium",
                  isLight ? "text-stone-500" : "text-stone-400"
                )}>
                  Entrevista · Company Brain
                </div>
                <h1 className={cn(
                  "mt-3 text-3xl md:text-4xl tracking-tight font-medium",
                  isLight ? "text-stone-900" : "text-stone-50"
                )}>
                  Te voy a hacer unas preguntas cortas.
                </h1>
                <p className="mt-4 text-stone-300 text-base md:text-lg leading-relaxed">
                  ~7 minutos. Hablá natural, como con un colega. Tu
                  input es lo que va a armar el sistema interno de tu empresa.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3">
                  <button
                    onClick={handleStart}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium shadow-lg transition-all",
                      isLight
                        ? "bg-stone-900 text-stone-50 shadow-stone-900/20 hover:bg-accent-600 hover:shadow-accent-500/30"
                        : "bg-stone-50 text-stone-900 shadow-black/30 hover:bg-accent-400 hover:text-stone-50 hover:shadow-accent-500/40"
                    )}
                  >
                    <Mic className="h-4 w-4" />
                    Empezar entrevista
                  </button>
                  <p className={cn("text-xs", isLight ? "text-stone-500" : "text-stone-500")}>
                    Vas a darle permiso al microfono cuando lo pida tu navegador.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {showLive && (
            <motion.div
              key="live"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center"
            >
              <GradientSphere phase={orbPhase} level={audioLevel} size={460} theme={theme} />
              <div className={cn("mt-10 h-6 text-sm font-medium", isLight ? "text-stone-700" : "text-stone-300")}>
                {phase === "starting" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Conectando…
                  </span>
                ) : (
                  statusText[phase]
                )}
              </div>

              {/* Live transcript (last 3 lines, soft) */}
              <div
                ref={transcriptScrollRef}
                className="mt-8 h-32 w-full max-w-xl overflow-hidden"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, black 30%, black 80%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0%, black 30%, black 80%, transparent 100%)",
                }}
              >
                <div className="space-y-2 text-sm leading-relaxed">
                  {transcript.slice(-6).map((t, i) => (
                    <motion.div
                      key={`${i}-${t.content.slice(0, 16)}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        t.role === "agent"
                          ? (isLight ? "text-stone-900" : "text-stone-100")
                          : (isLight ? "text-stone-500 italic" : "text-stone-400 italic")
                      )}
                    >
                      {t.role === "agent" ? "" : "tú: "}
                      {t.content}
                    </motion.div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleEnd}
                className={cn(
                "mt-10 inline-flex items-center gap-2 rounded-full backdrop-blur-sm px-5 py-2.5 text-sm font-medium shadow-sm transition-all",
                isLight
                  ? "border border-stone-300 bg-white/70 text-stone-700 hover:border-stone-500 hover:bg-white"
                  : "border border-stone-700/60 bg-stone-900/60 text-stone-200 hover:border-stone-500 hover:bg-stone-900/90"
              )}
              >
                <MicOff className="h-3.5 w-3.5" />
                Terminar entrevista
              </button>
            </motion.div>
          )}

          {showEnded && (
            <motion.div
              key="ended"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <GradientSphere phase="ended" size={300} theme={theme} />
              <div className="mt-10 max-w-md">
                <div className={cn(
                  "mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-4",
                  isLight ? "bg-accent-50" : "bg-accent-950/60 ring-1 ring-accent-500/30"
                )}>
                  <Sparkles className={cn("h-5 w-5", isLight ? "text-accent-600" : "text-accent-300")} strokeWidth={1.5} />
                </div>
                <h2 className={cn("text-2xl tracking-tight font-medium", isLight ? "text-stone-900" : "text-stone-50")}>
                  Listo — gracias!
                </h2>
                <p className={cn("mt-3 text-base leading-relaxed", isLight ? "text-stone-600" : "text-stone-300")}>
                  El Brain está procesando lo que charlamos. En segundos vas a
                  ver tu información integrada en{" "}
                  <a href="/brain/people" className="text-accent-700 underline-offset-4 hover:underline dark:text-accent-300">
                    el grafo de la empresa
                  </a>
                  .
                </p>
                <div className="mt-2 text-xs text-stone-500 font-mono">
                  duración: {fmtTime(elapsed)}
                </div>
              </div>
            </motion.div>
          )}

          {showError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center max-w-md"
            >
              <div className={cn(
                "mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                isLight ? "bg-red-50" : "bg-red-950/60 ring-1 ring-red-500/30"
              )}>
                <AlertTriangle className={cn("h-5 w-5", isLight ? "text-red-600" : "text-red-400")} strokeWidth={1.5} />
              </div>
              <h2 className={cn("text-2xl tracking-tight font-medium", isLight ? "text-stone-900" : "text-stone-50")}>
                No pudimos iniciar la entrevista
              </h2>
              <p className={cn("mt-3 text-sm leading-relaxed", isLight ? "text-stone-600" : "text-stone-300")}>
                {error || "Error desconocido"}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setPhase("ready");
                  setSpherePhase("idle");
                }}
                className={cn(
                "mt-6 rounded-full px-5 py-2 text-sm font-medium transition-all",
                isLight
                  ? "border border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                  : "border border-stone-700/60 bg-stone-900/60 text-stone-200 hover:border-stone-500 hover:bg-stone-900/90"
              )}
              >
                Reintentar
              </button>
              <p className="mt-4 text-xs text-stone-500">
                Si el problema persiste, escribinos a tomas@thecompanybrain.xyz
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>


    </div>
  );
}
