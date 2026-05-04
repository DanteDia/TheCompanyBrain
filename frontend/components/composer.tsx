"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSubmit, disabled, placeholder }: ComposerProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function send() {
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative rounded-xl border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all",
          disabled
            ? "border-stone-200 opacity-60"
            : "border-stone-300 focus-within:border-stone-500 focus-within:shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
        )}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={1}
          placeholder={placeholder || "Ask what you need…"}
          className="block w-full resize-none bg-transparent px-4 py-3.5 pr-12 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none disabled:cursor-not-allowed"
          style={{ maxHeight: "160px" }}
        />
        <button
          onClick={send}
          disabled={disabled || !value.trim()}
          className={cn(
            "absolute right-2 bottom-2.5 inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all",
            value.trim() && !disabled
              ? "bg-stone-900 text-white hover:bg-stone-800"
              : "bg-stone-100 text-stone-400 cursor-not-allowed"
          )}
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>
      </div>
      <div className="mt-2 px-1 text-[11px] text-stone-400 font-mono">
        Enter sends · Shift + Enter new line
      </div>
    </div>
  );
}
