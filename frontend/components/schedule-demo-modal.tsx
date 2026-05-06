"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Cal.com event URL. Override per-environment via NEXT_PUBLIC_BOOKING_URL.
const CAL_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL || "https://cal.com/tomas-.-thecompanybrain";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ScheduleDemoModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portal target: only on client. Avoids SSR/hydration mismatch.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Render at document.body via Portal so the fixed positioning escapes
  // any ancestor that creates a containing block (e.g., the SiteHeader,
  // which uses `backdrop-blur-md` — backdrop-filter creates a fixed
  // containing block, so a `fixed inset-0` child gets positioned relative
  // to the header instead of the viewport. Portal sidesteps that entirely.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Schedule guided demo"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/70 backdrop-blur-sm p-4 md:p-8 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white shadow-md hover:shadow-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 transition-all"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
        <iframe
          src={CAL_URL}
          className="w-full h-[min(720px,calc(100vh-4rem))] border-0 block"
          title="Schedule a guided demo with Company Brain"
          allow="camera; microphone; geolocation"
        />
      </div>
    </div>,
    document.body,
  );
}
