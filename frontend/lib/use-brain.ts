// useBrain — single source of truth for live Skills File data.
//
// Fetches GET /api/skills-file once on mount, adapts the backend Pydantic
// shape to the SAME interfaces the existing /brain/* pages already
// consume from mock-data.ts (Person, ToolEntity, ProcessEntity, …) so the
// page components don't need to change their field accesses.
//
// Falls back to the bundled mock data if the backend is unreachable.

"use client";

import { useEffect, useState } from "react";
import { getSkillsFile } from "./api-backend";
import {
  PEOPLE as MOCK_PEOPLE,
  TOOLS as MOCK_TOOLS,
  PROCESSES as MOCK_PROCESSES,
  type ToolEntity,
  type ProcessEntity,
} from "./mock-data";
import type {
  SkillsFile as BackendSkillsFile,
  Person as BackendPerson,
  Tool as BackendTool,
  Process as BackendProcess,
  AccessPath as BackendAccessPath,
  InformalRule as BackendRule,
  GlossaryTerm as BackendGlossary,
} from "./types-backend";
import type { Person, InformalRule, GlossaryTerm } from "./types";

export interface BrainData {
  people: Person[];
  tools: ToolEntity[];
  processes: ProcessEntity[];
  informal_rules: InformalRule[];
  glossary: GlossaryTerm[];
  relationships: unknown[];
  organization_name: string;
  source: "live" | "mock"; // tells the UI when we're showing fallback
}

const FALLBACK: BrainData = {
  people: MOCK_PEOPLE,
  tools: MOCK_TOOLS,
  processes: MOCK_PROCESSES,
  informal_rules: [],
  glossary: [],
  relationships: [],
  organization_name: "BIND Bank (mock)",
  source: "mock",
};

function adaptPerson(p: BackendPerson): Person {
  return {
    id: p.id,
    name: p.name,
    role: p.role || "",
    area: p.area || "",
    email: p.email || undefined,
    phone: p.phone || undefined,
    manager_id: p.manager_id || undefined,
    direct_reports: p.direct_reports || [],
    top_collaborators: p.top_collaborators || [],
    current_projects: p.current_projects || [],
    expertise_areas: p.expertise_areas || [],
    interviewed: !!p.last_interviewed_at,
    evidence: p.evidence || [],
  };
}

function inferCategory(name: string, purpose: string): string {
  const s = `${name} ${purpose}`.toLowerCase();
  if (s.match(/salesforce|crm|hubspot/)) return "CRM";
  if (s.match(/jira|service desk|ticket/)) return "Ticketing";
  if (s.match(/slack|teams|chat/)) return "Comunicación";
  if (s.match(/aws|cloud|server|database|postgres/)) return "Infraestructura";
  if (s.match(/bloomberg|refinitiv|trading/)) return "Trading / Markets";
  if (s.match(/workday|bamboo|hr/)) return "RRHH";
  if (s.match(/app store|google play|firebase|xcode|android/)) return "Mobile";
  if (s.match(/sharepoint|drive|notion|confluence/)) return "Documentos";
  if (s.match(/gmail|outlook|email/)) return "Email";
  if (s.match(/banco|core|bantotal/)) return "Core Banking";
  return "Sistema";
}

function adaptTool(
  t: BackendTool,
  accessPaths: BackendAccessPath[]
): ToolEntity {
  // Match the AccessPath that targets this tool, if any
  const ap = accessPaths.find((a) => a.target_tool_id === t.id);
  const requestedTo = ap?.requested_to || "?";
  const requires = ap?.requires?.length
    ? ` (${ap.requires.join(", ")})`
    : "";
  const accessPath = ap
    ? `Pedir a ${requestedTo}${requires}`
    : "Sin path documentado";
  return {
    id: t.id,
    name: t.name,
    category: inferCategory(t.name, t.purpose || ""),
    purpose: t.purpose || "",
    owner_id: (t.owners && t.owners[0]) || "",
    used_by_areas: t.used_by_areas || [],
    access_path: accessPath,
    sla: ap?.sla || "—",
  };
}

function adaptProcess(
  p: BackendProcess,
  people: BackendPerson[]
): ProcessEntity {
  const owner = p.owner_id ? people.find((x) => x.id === p.owner_id) : null;
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    owner_id: p.owner_id || "",
    participants: p.participants || [],
    area: owner?.area || "—",
    steps: (p as { related_tools?: string[] }).related_tools?.length || 0,
    sla: "—",
  };
}

function adaptRule(r: BackendRule): InformalRule {
  return {
    id: r.id,
    description: r.description,
    context: r.context || "",
    learned_from: r.learned_from || [],
    evidence: r.evidence || [],
  };
}

function adaptGlossary(g: BackendGlossary): GlossaryTerm {
  return {
    id: g.id,
    term: g.term,
    definition: g.definition || "",
    evidence: g.evidence || [],
  };
}

function adapt(sf: BackendSkillsFile): BrainData {
  const accessPaths = (sf as { access_paths?: BackendAccessPath[] })
    .access_paths || [];
  return {
    people: (sf.people || []).map(adaptPerson),
    tools: (sf.tools || []).map((t) => adaptTool(t, accessPaths)),
    processes: (sf.processes || []).map((p) => adaptProcess(p, sf.people || [])),
    informal_rules: (sf.informal_rules || []).map(adaptRule),
    glossary: (sf.glossary || []).map(adaptGlossary),
    relationships: sf.relationships || [],
    organization_name: sf.organization_name || "Empresa demo",
    source: "live",
  };
}

export function useBrain() {
  const [state, setState] = useState<{
    loading: boolean;
    error: Error | null;
    data: BrainData;
  }>({ loading: true, error: null, data: FALLBACK });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sf = await getSkillsFile();
        if (cancelled) return;
        setState({ loading: false, error: null, data: adapt(sf) });
      } catch (e) {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error(String(e));
        setState({ loading: false, error: err, data: FALLBACK });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
