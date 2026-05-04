// useBrain — single source of truth for live Skills File data.
//
// Fetches GET /api/skills-file once on mount, adapts the backend Pydantic
// shape to the frontend's Person/Tool/Process/InformalRule types, and
// caches the result for the page lifecycle.
//
// Falls back to the bundled mock data if the backend is unreachable so the
// /brain/* pages never render empty during local dev or while Render is
// cold-starting.

"use client";

import { useEffect, useState } from "react";
import { getSkillsFile } from "./api-backend";
import {
  PEOPLE as MOCK_PEOPLE,
  TOOLS as MOCK_TOOLS,
  PROCESSES as MOCK_PROCESSES,
} from "./mock-data";
import type {
  SkillsFile as BackendSkillsFile,
  Person as BackendPerson,
  Tool as BackendTool,
  Process as BackendProcess,
  InformalRule as BackendRule,
  GlossaryTerm as BackendGlossary,
} from "./types-backend";
import type {
  Person,
  Tool,
  Process,
  InformalRule,
  GlossaryTerm,
} from "./types";

export interface BrainData {
  people: Person[];
  tools: Tool[];
  processes: Process[];
  informal_rules: InformalRule[];
  glossary: GlossaryTerm[];
  relationships: unknown[];
  organization_name: string;
  source: "live" | "mock"; // tells the UI when we're showing fallback
}

const FALLBACK: BrainData = {
  people: MOCK_PEOPLE,
  tools: MOCK_TOOLS as unknown as Tool[],
  processes: MOCK_PROCESSES as unknown as Process[],
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

function adaptTool(t: BackendTool): Tool {
  return {
    id: t.id,
    name: t.name,
    purpose: t.purpose || "",
    owners: t.owners || [],
    used_by_areas: t.used_by_areas || [],
    access_path_id: t.access_path_id || undefined,
    evidence: t.evidence || [],
  };
}

function adaptProcess(p: BackendProcess): Process {
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    owner_id: p.owner_id || undefined,
    participants: p.participants || [],
    evidence: p.evidence || [],
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
  return {
    people: (sf.people || []).map(adaptPerson),
    tools: (sf.tools || []).map(adaptTool),
    processes: (sf.processes || []).map(adaptProcess),
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
        // Backend down or unreachable — keep mock fallback so the page still
        // renders something useful for demo / dev.
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
