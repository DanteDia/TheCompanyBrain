"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import { SlackLogo, GoogleDriveLogo, ClickUpLogo, GmailLogo } from "./brand-logos";

/**
 * Brain visualization (symmetric):
 *  Left — employee avatar with caption "Employees / Interviewed via AI agent"
 *  Center — bank logo (the Brain)
 *  Right — tools logos with caption "Connected to / Your Tools"
 *
 * Animated light pulses travel from each side toward the center brain.
 */
export function BrainNetwork() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* SVG behind: connector lines with flowing dashes */}
      <svg
        viewBox="0 0 600 96"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 w-full pointer-events-none"
        style={{ height: "96px" }}
        aria-hidden
      >
        {/* Static base line (faint) — left */}
        <line
          x1="135"
          y1="48"
          x2="265"
          y2="48"
          stroke="#E7E5E4"
          strokeWidth="2"
          strokeDasharray="7 6"
        />
        {/* Animated overlay — dashes flow employee → brain */}
        <motion.line
          x1="135"
          y1="48"
          x2="265"
          y2="48"
          stroke="#D2691E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="7 6"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -26 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />

        {/* Static base line — right */}
        <line
          x1="335"
          y1="48"
          x2="465"
          y2="48"
          stroke="#E7E5E4"
          strokeWidth="2"
          strokeDasharray="7 6"
        />
        {/* Animated overlay — dashes flow tools → brain */}
        <motion.line
          x1="335"
          y1="48"
          x2="465"
          y2="48"
          stroke="#D2691E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="7 6"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: 26 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* 3-column grid, all icons centered on the same vertical line */}
      <div className="relative grid grid-cols-3 items-start gap-4 max-w-2xl mx-auto">
        {/* Left — Employee */}
        <NodeColumn
          icon={
            <div className="h-24 w-24 rounded-full bg-white border border-stone-200 shadow-sm overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&h=240&fit=crop&crop=faces&q=85"
                alt="Employee portrait"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          }
          title="Employees"
          subtitle="Interviewed via AI agent"
        />

        {/* Center — Bank Brain */}
        <NodeColumn
          icon={
            <div className="relative">
              {/* Soft glow */}
              <div className="absolute inset-0 rounded-full bg-accent-100/60 blur-xl scale-110" />
              <div className="relative h-24 w-24 rounded-full bg-white border-2 border-accent-200 shadow-md flex items-center justify-center">
                <Landmark
                  className="h-11 w-11 text-stone-800"
                  strokeWidth={1.5}
                />
              </div>
            </div>
          }
          title="Company Brain"
          subtitle="Knowledge graph"
        />

        {/* Right — Tools */}
        <NodeColumn
          icon={
            <div className="h-24 w-24 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-center">
              <div className="grid grid-cols-2 gap-2">
                <SlackLogo className="h-7 w-7" />
                <GoogleDriveLogo className="h-7 w-7" />
                <ClickUpLogo className="h-7 w-7" />
                <GmailLogo className="h-7 w-7" />
              </div>
            </div>
          }
          title="Connected to"
          subtitle="Your tools"
        />
      </div>
    </div>
  );
}

interface NodeColumnProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function NodeColumn({ icon, title, subtitle }: NodeColumnProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {icon}
      <div className="text-center leading-tight">
        <div className="text-sm font-medium text-stone-900">{title}</div>
        <div className="text-sm text-stone-500 mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

/** Stylized employee avatar — friendly female portrait */
function EmployeeAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="96" height="96" fill="#FEF3E2" />

      {/* Hair back */}
      <path
        d="M 22 44 C 22 24 32 16 48 16 C 64 16 74 24 74 44 V 70 H 68 V 50 H 28 V 70 H 22 Z"
        fill="#3F2410"
      />

      {/* Face */}
      <circle cx="48" cy="42" r="16" fill="#F5C8A4" />

      {/* Hair fringe (over forehead) */}
      <path
        d="M 32 38 Q 32 24 48 24 Q 64 24 64 38 Q 60 32 48 32 Q 36 32 32 38 Z"
        fill="#3F2410"
      />

      {/* Eyes */}
      <ellipse cx="42" cy="42" rx="1.2" ry="1.6" fill="#1C1917" />
      <ellipse cx="54" cy="42" rx="1.2" ry="1.6" fill="#1C1917" />

      {/* Cheek blush */}
      <circle cx="38" cy="48" r="2" fill="#F5A8A0" opacity="0.4" />
      <circle cx="58" cy="48" r="2" fill="#F5A8A0" opacity="0.4" />

      {/* Smile */}
      <path
        d="M 42 50 Q 48 54 54 50"
        stroke="#1C1917"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Suit / blazer body */}
      <path
        d="M 16 96 Q 16 78 32 72 L 48 80 L 64 72 Q 80 78 80 96 Z"
        fill="#1F2937"
      />
      {/* Shirt collar */}
      <path d="M 40 72 L 48 82 L 56 72 V 80 L 48 86 L 40 80 Z" fill="#FAFAF9" />
      {/* Hair side strands */}
      <path d="M 22 44 V 70 Q 24 76 28 76 V 60 Z" fill="#3F2410" />
      <path d="M 74 44 V 70 Q 72 76 68 76 V 60 Z" fill="#3F2410" />
    </svg>
  );
}
