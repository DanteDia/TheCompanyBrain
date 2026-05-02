"use client";

import { useEffect, useState, FormEvent } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const STORAGE_KEY = "cb-admin-auth";
const ADMIN_PASSWORD = "1234";

export function AdminPasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setAuthed(stored === "1");
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  // Loading state — render nothing until we know auth status (avoids flash)
  if (authed === null) {
    return <div className="h-dvh bg-stone-50" />;
  }

  if (authed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium text-stone-900">Admin acceso</div>
              <div className="text-xs text-stone-500">
                Ingresá la contraseña interna
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoFocus
              placeholder="Contraseña"
              className={`w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-1 transition-colors ${
                error
                  ? "border-red-400"
                  : "border-stone-300 focus:border-stone-500"
              }`}
            />
            {error && (
              <div className="text-xs text-red-600">
                Contraseña incorrecta. Intentá de nuevo.
              </div>
            )}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-stone-100 text-[11px] text-stone-400">
            Si no tenés la contraseña, hablá con tu admin.
          </div>
        </div>
      </div>
    </div>
  );
}
