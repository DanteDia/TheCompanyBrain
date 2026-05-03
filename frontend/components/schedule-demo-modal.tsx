"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Where the calendar widget lives. Replace with your Cal.com / Calendly /
// Zoho Bookings URL once you've set it up.
//
// For Cal.com (recommended, free):
//   1. Sign up at https://cal.com with tomas@thebraincompany.xyz
//   2. Pick a username (e.g. tomas-cb) → your link becomes cal.com/tomas-cb
//   3. Create a "30min Demo" event type
//   4. Paste the event URL here:
const CAL_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL || "https://cal.com/tomas-.-thecompanybrain";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ScheduleDemoModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

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

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Agendar demo guiada"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-sm p-4 md:p-8 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
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
          className="w-full h-[80vh] md:h-[720px] border-0 block"
          title="Agendar demo guiada con Company Brain"
          allow="camera; microphone; geolocation"
        />
      </div>
    </div>
  );
}
