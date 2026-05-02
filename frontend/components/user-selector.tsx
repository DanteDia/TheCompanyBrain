"use client";

import { useState, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PEOPLE } from "@/lib/mock-data";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export function useActiveUser(): [Person, (id: string) => void] {
  const [userId, setUserId] = useState<string>("analyst_jr");

  useEffect(() => {
    const stored = localStorage.getItem("cb-user-id");
    if (stored && PEOPLE.find((p) => p.id === stored)) {
      setUserId(stored);
    }
  }, []);

  const update = (id: string) => {
    setUserId(id);
    localStorage.setItem("cb-user-id", id);
  };

  const user = PEOPLE.find((p) => p.id === userId) || PEOPLE[0];
  return [user, update];
}

export function UserSelector({
  user,
  onChange,
}: {
  user: Person;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-md hover:bg-stone-100 px-2 py-1 transition-colors"
      >
        <Avatar name={user.name} size="sm" />
        <div className="text-left hidden sm:block">
          <div className="text-sm font-medium text-stone-900 leading-tight">
            {user.name}
          </div>
          <div className="text-[11px] text-stone-500 leading-tight">
            {user.role}
          </div>
        </div>
        <ChevronDown className="h-3 w-3 text-stone-400" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-stone-200 bg-white shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-stone-100 text-[11px] uppercase tracking-wider text-stone-500">
              Demo · ver respuestas como otro empleado
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {PEOPLE.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 hover:bg-stone-50 transition-colors text-left",
                    p.id === user.id && "bg-stone-50"
                  )}
                >
                  <Avatar name={p.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-stone-500 truncate">
                      {p.role}
                    </div>
                  </div>
                  {p.id === user.id && (
                    <span className="text-[10px] uppercase tracking-wider text-accent-600 font-medium">
                      Activo
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
