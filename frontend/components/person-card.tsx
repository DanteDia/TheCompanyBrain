import { Mail, Phone, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { findPerson } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function PersonCard({ id, compact = false }: { id: string; compact?: boolean }) {
  const person = findPerson(id);
  if (!person) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-xs">
        <Avatar name={person.name} size="sm" className="!h-5 !w-5 !text-[9px]" />
        <span className="font-medium text-stone-900">{person.name}</span>
        <span className="text-stone-500">· {person.role}</span>
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={person.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-stone-900">{person.name}</div>
          <div className="text-sm text-stone-500 mt-0.5">
            {person.role} · {person.area}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-stone-600 font-mono">
            {person.email && (
              <a
                href={`mailto:${person.email}`}
                className="inline-flex items-center gap-1 hover:text-accent-600 transition-colors"
              >
                <Mail className="h-3 w-3" />
                {person.email}
              </a>
            )}
            {person.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {person.phone}
              </span>
            )}
          </div>
          {person.expertise_areas && person.expertise_areas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {person.expertise_areas.slice(0, 3).map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center rounded-md bg-white border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Mail className="h-3 w-3" />
              Enviar mensaje
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <ExternalLink className="h-3 w-3" />
              Ver perfil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
