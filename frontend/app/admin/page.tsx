import Link from "next/link";
import { ArrowRight, Users, Wrench, Workflow, MessageCircle, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  COVERAGE,
  RECENT_QUERIES,
  PEOPLE,
  ORGANIZATION,
  INTERVIEWS,
} from "@/lib/mock-data";

export default function AdminOverviewPage() {
  const pendingInterviews = INTERVIEWS.filter((i) => i.status !== "completed");
  const pendingPeople = pendingInterviews
    .map((i) => PEOPLE.find((p) => p.id === i.person_id))
    .filter(Boolean);

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          {ORGANIZATION.name}
        </div>
        <h1 className="text-3xl tracking-tight font-medium text-stone-900 mt-1">
          Brain overview
        </h1>
      </header>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiTile
          label="People interviewed"
          value={`${COVERAGE.interviewed} / ${COVERAGE.total_employees}`}
          unit={`${COVERAGE.pct_interviewed}% of bank`}
          progress={COVERAGE.pct_interviewed}
          accent
        />
        <KpiTile
          label="People"
          value={String(COVERAGE.entities_by_type.people)}
          unit="in the Brain"
          icon={Users}
        />
        <KpiTile
          label="Queries / Prompts"
          value={String(COVERAGE.queries_this_week)}
          unit="this week"
          icon={MessageCircle}
        />
      </div>

      {/* Entities breakdown */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-stone-900">Brain composition</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Entities extracted from {COVERAGE.interviewed} interviews + org chart
            </p>
          </div>
          <Link href="/brain/people">
            <Button variant="ghost" size="sm">
              Explore the Brain <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { Icon: Users, label: "People", value: COVERAGE.entities_by_type.people },
            { Icon: Wrench, label: "Systems", value: COVERAGE.entities_by_type.tools },
            { Icon: Workflow, label: "Processes", value: COVERAGE.entities_by_type.processes },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-md border border-stone-200 px-3 py-2.5">
              <Icon className="h-3.5 w-3.5 text-stone-400 mb-1.5" strokeWidth={1.5} />
              <div className="text-xs text-stone-500">{label}</div>
              <div className="text-xl font-medium text-stone-900 font-mono mt-0.5">
                {value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending interviews */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-stone-900">Pending interviews</h2>
              <p className="text-sm text-stone-500 mt-0.5">
                {pendingPeople.length} personas todavía sin entrevistar
              </p>
            </div>
            <Link href="/admin/interviews">
              <Button variant="ghost" size="sm">
                See all
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {pendingPeople.map((p) => (
              <div
                key={p!.id}
                className="flex items-center gap-3 rounded-md border border-stone-200 px-3 py-2"
              >
                <Avatar name={p!.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    {p!.name}
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {p!.role} · {p!.area}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Reschedule
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent queries */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-stone-900">Top queries this week</h2>
              <p className="text-sm text-stone-500 mt-0.5">
                {COVERAGE.queries_resolved_pct}% answered
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-green-700" />
          </div>
          <div className="space-y-2">
            {RECENT_QUERIES.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-md border border-stone-200 px-3 py-2"
              >
                <span className="text-[10px] font-mono text-stone-400 mt-0.5">
                  {String(q.count).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-900 truncate">
                    {q.query}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] !py-0">
                      {q.type}
                    </Badge>
                    {q.resolved ? (
                      <span className="text-[11px] text-green-700">Resolved</span>
                    ) : (
                      <span className="text-[11px] text-yellow-700">Sin respuesta</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

interface KpiProps {
  label: string;
  value: string;
  unit: string;
  progress?: number;
  accent?: boolean;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

function KpiTile({ label, value, unit, progress, accent, icon: Icon }: KpiProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
          {label}
        </div>
        {Icon && <Icon className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.5} />}
      </div>
      <div className="mt-2 text-3xl font-medium tracking-tight text-stone-900 font-mono">
        {value}
      </div>
      <div className="text-xs text-stone-500 mt-1">{unit}</div>
      {progress !== undefined && (
        <div className="mt-3 h-1 rounded-full bg-stone-100 overflow-hidden">
          <div
            className={accent ? "h-full bg-accent-500" : "h-full bg-stone-700"}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
