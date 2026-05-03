"use client";

import { useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startWebCall, ApiError } from "@/lib/api-backend";

interface Props {
  employee_id: string;
  organization_id?: string;
  variant?: "outline" | "default" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function WebCallButton({
  employee_id,
  organization_id,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setErr(null);
    try {
      const r = await startWebCall(employee_id, organization_id);
      // Open the Retell-hosted call page in a new tab — mic permission is
      // requested there.
      window.open(r.call_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      const msg =
        e instanceof ApiError ? `${e.status} — ${e.message}` : (e as Error).message;
      setErr(msg);
      console.warn("[WebCall] failed:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
        className="h-7 text-xs"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Mic className="h-3 w-3" />
        )}
        Entrevista en vivo
      </Button>
      {err && <div className="mt-1 text-[10px] text-red-700">{err}</div>}
    </div>
  );
}
