import { Phone, Check, Clock, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WebCallButton } from "@/components/web-call-button";
import { INTERVIEWS, PEOPLE } from "@/lib/mock-data";

export default function InterviewsPage() {
  const completed = INTERVIEWS.filter((i) => i.status === "completed");
  const scheduled = INTERVIEWS.filter((i) => i.status === "scheduled");
  const pending = INTERVIEWS.filter((i) => i.status === "pending");

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
            Discovery
          </div>
          <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
            Interviews
          </h1>
          <p className="mt-2 text-stone-600">
            {completed.length} completadas · {scheduled.length} agendadas ·{" "}
            {pending.length} pendientes
          </p>
        </div>
        <Button>
          <Calendar className="h-4 w-4" />
          Agendar nueva
        </Button>
      </header>

      {/* Completed */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
          <Check className="h-4 w-4 text-green-700" strokeWidth={2} />
          Completadas
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {completed.map((i) => {
            const person = PEOPLE.find((p) => p.id === i.person_id);
            if (!person) return null;
            return <InterviewCard key={i.person_id} interview={i} person={person} />;
          })}
        </div>
      </section>

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-700" strokeWidth={2} />
            Agendadas
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {scheduled.map((i) => {
              const person = PEOPLE.find((p) => p.id === i.person_id);
              if (!person) return null;
              return <InterviewCard key={i.person_id} interview={i} person={person} />;
            })}
          </div>
        </section>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-500" strokeWidth={2} />
            Pendientes de agendar
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {pending.map((i) => {
              const person = PEOPLE.find((p) => p.id === i.person_id);
              if (!person) return null;
              return <InterviewCard key={i.person_id} interview={i} person={person} />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function InterviewCard({
  interview,
  person,
}: {
  interview: (typeof INTERVIEWS)[number];
  person: (typeof PEOPLE)[number];
}) {
  const statusInfo = {
    completed: { label: "Completada", variant: "success" as const, icon: Check },
    scheduled: { label: "Agendada", variant: "info" as const, icon: Calendar },
    pending: { label: "Pendiente", variant: "outline" as const, icon: Clock },
  }[interview.status];
  const Icon = statusInfo.icon;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={person.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-stone-900 truncate">{person.name}</div>
            <Badge variant={statusInfo.variant} className="text-[10px] !py-0">
              <Icon className="h-2.5 w-2.5" />
              {statusInfo.label}
            </Badge>
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            {person.role} · {person.area}
          </div>

          {interview.status === "completed" && (
            <>
              <div className="flex items-center gap-3 mt-3 text-xs text-stone-600 font-mono">
                <span>⏱ {interview.duration}</span>
                <span>·</span>
                <span>{interview.entities_extracted} entidades</span>
                <span>·</span>
                <span className="text-accent-700">
                  {interview.informal_rules} reglas informales
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Ver transcript
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Ver extracción
                </Button>
              </div>
            </>
          )}

          {interview.status !== "completed" && (
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Phone className="h-3 w-3" />
                {interview.status === "scheduled" ? "Reagendar" : "Agendar"}
              </Button>
              <WebCallButton employee_id={person.id} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
