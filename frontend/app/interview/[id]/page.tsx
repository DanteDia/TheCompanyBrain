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
import { Mic, MicOff, Loader2, AlertTriangle } from "lucide-react";
import { GradientSphere, type SpherePhase } from "@/components/gradient-sphere";
import { Logo } from "@/components/ui/logo";
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
        { role: "agent", content: "Hi, I'm the Company Brain agent. I'll ask you a few short questions — ready?", delayMs: 1500 },
        { role: "user", content: "Yes, go ahead.", delayMs: 5500 },
        { role: "agent", content: "Perfect. To start — tell me in one sentence what you do in your role.", delayMs: 7000 },
        { role: "user", content: "I'm co-founder and I run marketing & growth — website, content, prospect outreach.", delayMs: 12000 },
        { role: "agent", content: "Great. What tools do you use day-to-day?", delayMs: 14500 },
        { role: "user", content: "Notion for docs, Vercel to deploy the landing, Cal.com for booking, and Slack with the team.", delayMs: 19000 },
        { role: "agent", content: "Excellent. If someone needs access to Vercel, who do they ask?", delayMs: 21500 },
        { role: "user", content: "They ask me — I'm the workspace owner.", delayMs: 25000 },
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
      // Read the per-org language preference (set in /admin/settings).
      // Defaults to 'en'; agent speaks Spanish if the admin toggled to 'es'.
      const lang =
        typeof window !== "undefined" &&
        localStorage.getItem(`cb-org-language-${orgId}`) === "es"
          ? "es"
          : "en";
      const r = await startWebCall(employeeId, orgId, lang);
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
    ready: "Ready when you are",
    starting: "Connecting…",
    live:
      orbPhase === "speaking"
        ? "The agent is talking"
        : orbPhase === "listening"
        ? "I'm listening — go ahead"
        : "Live",
    ended: "Interview finished",
    error: "Something went wrong",
  };

  return (
<div className="relative h-dvh w-full overflow-hidden bg-stone-50 text-stone-900">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 40%, rgba(254,243,226,1) 0%, rgba(250,238,222,0.6) 40%, rgba(245,245,244,0) 75%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,169,97,0.18) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 py-5">
        <Logo variant="default" priority />
        {phase === "live" && (
          <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 backdrop-blur-sm px-3 py-1 text-xs font-mono text-stone-700 shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            REC · {fmtTime(elapsed)}
          </div>
        )}
        {isMock && phase !== "live" && (
          <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-700">
            Mock mode — UI only, no live call
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
              <GradientSphere phase="idle" size={360} theme="light" />
              <div className="mt-12 max-w-md">
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
                  Interview · Company Brain
                </div>
                <h1 className="mt-3 text-3xl md:text-4xl tracking-tight font-medium text-stone-900">
                  I'll ask you a few short questions.
                </h1>
                <p className="mt-4 text-base md:text-lg leading-relaxed text-stone-600">
                  ~7 minutes. Speak naturally, like with a colleague.
                  Your input is what builds your company's internal system.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3">
                  <button
                    onClick={handleStart}
                    className="group inline-flex items-center gap-2 rounded-full bg-stone-900 px-7 py-3.5 text-sm font-medium text-stone-50 shadow-lg shadow-stone-900/20 transition-all hover:bg-accent-600 hover:shadow-accent-500/30"
                  >
                    <Mic className="h-4 w-4" />
                    Start interview
                  </button>
                  <p className="text-xs text-stone-500">
                    You'll grant mic permission when your browser asks.
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
              <GradientSphere phase={orbPhase} level={audioLevel} size={400} theme="light" />
              <div className="mt-10 h-6 text-sm font-medium text-stone-700">
                {phase === "starting" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Connecting…
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
                      className={t.role === "agent" ? "text-stone-900" : "text-stone-500 italic"}
                    >
                      {t.role === "agent" ? "" : "you: "}
                      {t.content}
                    </motion.div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleEnd}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/90 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-stone-700 shadow-md transition-all hover:border-stone-500 hover:bg-white"
              >
                <MicOff className="h-3.5 w-3.5" />
                End interview
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
              <GradientSphere phase="ended" size={260} theme="light" />
              <div className="mt-10 max-w-md">
                <h2 className="text-2xl tracking-tight font-medium text-stone-900">
                  Done — thanks!
                </h2>
                <p className="mt-3 text-base leading-relaxed text-stone-600">
                  The Brain is processing what we talked about. In seconds you'll see your information integrated into{" "}
                  <a href="/brain/people" className="text-accent-700 underline-offset-4 hover:underline">
                    the company graph
                  </a>
                  .
                </p>
                <div className="mt-2 text-xs text-stone-500 font-mono">
                  duration: {fmtTime(elapsed)}
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
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl tracking-tight font-medium text-stone-900">
                We couldn't start the interview
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                {error || "Unknown error"}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setPhase("ready");
                  setSpherePhase("idle");
                }}
                className="mt-6 rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 transition-all hover:border-stone-500"
              >
                Retry
              </button>
              <p className="mt-4 text-xs text-stone-500">
                If the problem persists, write to tomas@thecompanybrain.xyz
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>


    </div>
  );
}
