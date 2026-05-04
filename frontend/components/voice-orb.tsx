"use client";

/**
 * VoiceOrb — animated orb that reacts to call phase + (optional) audio level.
 *
 * Inspired by OpenAI's voice-mode UI but in our terracotta/stone palette.
 * Three stacked layers: outer glow halo, mid rotating ring, core blob with
 * organic deformation. CSS animations only — no canvas, lightweight.
 *
 * `phase` drives the visual intensity:
 *   - "idle"       → calm breathing (4s loop, subtle)
 *   - "connecting" → fast pulse + ring spin
 *   - "listening"  → calm with tiny ripples (agent waiting for user)
 *   - "speaking"   → vivid wobble + bigger halo (agent talking)
 *   - "ended"      → dimmed, frozen
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "connecting" | "listening" | "speaking" | "ended";

export interface VoiceOrbProps {
  phase: Phase;
  /** Optional 0..1 audio amplitude — if provided, drives extra wobble. */
  level?: number;
  className?: string;
  size?: number; // px, default 320
}

export function VoiceOrb({ phase, level = 0, className, size = 320 }: VoiceOrbProps) {
  // Synthesize a soft level when no real audio level is wired yet, so the
  // orb feels alive during the demo even before AudioContext analysis.
  const [synth, setSynth] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (level > 0) {
      // Real audio is feeding us — don't synthesize
      setSynth(0);
      return;
    }
    let t = 0;
    const tick = () => {
      t += 0.04;
      // Layered sine waves for an organic feel
      const v =
        0.5 +
        0.3 * Math.sin(t * 1.7) +
        0.15 * Math.sin(t * 3.1 + 1.2) +
        0.1 * Math.sin(t * 5.3 + 0.4);
      setSynth(Math.max(0, Math.min(1, v)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [level]);

  const amp = level || synth;

  // Phase-dependent visual params
  const cfg = {
    idle: { coreScale: 1, haloOpacity: 0.5, ringSpeed: "60s", ringOpacity: 0.4, breathe: "4s", glowIntensity: 0.6 },
    connecting: { coreScale: 1.05, haloOpacity: 0.7, ringSpeed: "8s", ringOpacity: 0.7, breathe: "1.4s", glowIntensity: 0.8 },
    listening: { coreScale: 1, haloOpacity: 0.55, ringSpeed: "30s", ringOpacity: 0.5, breathe: "5s", glowIntensity: 0.6 },
    speaking: { coreScale: 1.08, haloOpacity: 0.85, ringSpeed: "12s", ringOpacity: 0.7, breathe: "2s", glowIntensity: 1 },
    ended: { coreScale: 0.95, haloOpacity: 0.2, ringSpeed: "0s", ringOpacity: 0.1, breathe: "0s", glowIntensity: 0.2 },
  }[phase];

  // Audio amp drives subtle additional scaling (only in speaking/listening)
  const reactiveScale =
    phase === "speaking" ? 1 + amp * 0.06 : phase === "listening" ? 1 + amp * 0.02 : 1;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer halo — large, soft, behind everything */}
      <div
        className={cn(
          "absolute rounded-full",
          phase !== "ended" && "animate-orb-pulse"
        )}
        style={{
          width: size * 1.5,
          height: size * 1.5,
          opacity: cfg.haloOpacity * cfg.glowIntensity,
          background:
            "radial-gradient(circle, rgba(245,169,97,0.55) 0%, rgba(210,105,30,0.25) 40%, rgba(210,105,30,0) 70%)",
          filter: `blur(${24 + amp * 8}px)`,
          transform: `scale(${reactiveScale})`,
          transition: "opacity 600ms ease, filter 200ms ease",
          animationDuration: cfg.breathe,
        }}
      />

      {/* Mid rotating ring — gradient stroke */}
      <svg
        viewBox="0 0 100 100"
        className="absolute"
        style={{
          width: size * 1.05,
          height: size * 1.05,
          opacity: cfg.ringOpacity,
          animation:
            phase === "ended" ? "none" : `orb-spin ${cfg.ringSpeed} linear infinite`,
        }}
      >
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FAC88F" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#D2691E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A0522D" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="0.7"
          strokeDasharray="2 4"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="0.4"
          strokeDasharray="1 8"
        />
      </svg>

      {/* Core blob — multi-stop gradient with organic deformation */}
      <div
        className={cn(
          "relative rounded-full",
          phase !== "ended" && "animate-orb-breathe"
        )}
        style={{
          width: size * 0.72,
          height: size * 0.72,
          background: `
            radial-gradient(circle at 30% 25%, rgba(254,243,226,0.95) 0%, rgba(245,169,97,0.6) 25%, transparent 55%),
            radial-gradient(circle at 70% 75%, rgba(160,82,45,0.65) 0%, transparent 50%),
            linear-gradient(135deg, #EB8C40 0%, #D2691E 45%, #A0522D 100%)
          `,
          boxShadow: `
            0 0 ${40 + amp * 30}px rgba(210,105,30,${0.4 * cfg.glowIntensity}),
            0 0 ${80 + amp * 60}px rgba(245,169,97,${0.25 * cfg.glowIntensity}),
            inset 0 -20px 40px rgba(124,63,31,0.4),
            inset 0 20px 40px rgba(254,243,226,0.3)
          `,
          transform: `scale(${cfg.coreScale * reactiveScale})`,
          transition: "transform 200ms ease, box-shadow 200ms ease",
          animationDuration: cfg.breathe,
        }}
      >
        {/* Inner highlight that subtly shifts */}
        <div
          className="absolute inset-2 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.5) 0%, transparent 35%)",
            opacity: 0.7 + amp * 0.3,
          }}
        />
        {/* Bottom shadow for depth */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 65% 75%, rgba(60,30,15,0.35) 0%, transparent 40%)",
          }}
        />
      </div>

      {/* Speaking-mode emanating ripples */}
      {phase === "speaking" && (
        <>
          <div
            className="absolute rounded-full border border-accent-400/40 animate-orb-ripple"
            style={{ width: size * 0.85, height: size * 0.85, animationDelay: "0s" }}
          />
          <div
            className="absolute rounded-full border border-accent-400/30 animate-orb-ripple"
            style={{ width: size * 0.85, height: size * 0.85, animationDelay: "1s" }}
          />
          <div
            className="absolute rounded-full border border-accent-400/20 animate-orb-ripple"
            style={{ width: size * 0.85, height: size * 0.85, animationDelay: "2s" }}
          />
        </>
      )}
    </div>
  );
}

export type { Phase as OrbPhase };
