// Shared TypeScript types — must stay in sync with backend/models/schemas.py

export interface EvidenceSpan {
  source_type: 'interview' | 'document' | 'org_chart' | 'manual_edit';
  source_id: string;
  speaker?: string;
  timestamp_seconds?: number;
  quote: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  area: string;
  email?: string;
  phone?: string;
  manager_id?: string;
  direct_reports: string[];
  top_collaborators: string[];
  current_projects: string[];
  recurring_meetings: string[];
  owns_processes: string[];
  expertise_areas: string[];
  is_active: boolean;
  last_interviewed_at?: string;
  evidence: EvidenceSpan[];
}

export interface Tool {
  id: string;
  name: string;
  purpose: string;
  owners: string[];
  used_by_areas: string[];
  access_path_id?: string;
  evidence: EvidenceSpan[];
}

export interface AccessPath {
  id: string;
  target_tool_id: string;
  requested_to: string;
  requires: string[];
  sla?: string;
  evidence: EvidenceSpan[];
}

export interface Process {
  id: string;
  name: string;
  description: string;
  owner_id?: string;
  participants: string[];
  related_tools: string[];
  evidence: EvidenceSpan[];
}

export interface InformalRule {
  id: string;
  description: string;
  context: string;
  learned_from: string[];
  evidence: EvidenceSpan[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  related_terms: string[];
  evidence: EvidenceSpan[];
}

export interface Citation {
  entity_type: string;
  entity_id: string;
  quote: string;
  speaker?: string;
  source_type: string;
  source_id: string;
}

export interface FollowUpSuggestion {
  text: string;
  why?: string;
}

export interface Answer {
  summary: string;
  person_to_contact?: Person | null;
  person_to_contact_id?: string;
  procedure?: string;
  sla?: string;
  insufficient_information: boolean;
  referenced_entity_ids: string[];
  citations: Citation[];
  follow_ups: FollowUpSuggestion[];
  thinking_trace?: string | null;
  router_selection?: Record<string, unknown>;
}

export interface Coverage {
  interviewed: number;
  total_employees: number;
}

export interface SkillsFile {
  organization_id: string;
  organization_name: string;
  generated_at: string;
  version: string;
  coverage: Coverage;
  people: Person[];
  tools: Tool[];
  access_paths: AccessPath[];
  processes: Process[];
  ticket_types: unknown[];
  glossary: GlossaryTerm[];
  informal_rules: InformalRule[];
  relationships: unknown[];
  knowledge_gaps: string[];
}

export interface InterviewSummary {
  id: string;
  employee_id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  duration_sec?: number;
  completed_at?: string;
}

export interface InterviewsResponse {
  organization_id: string;
  interviews: InterviewSummary[];
  coverage: Coverage;
}

export interface WebCallResponse {
  ok: boolean;
  call_id: string;
  agent_id: string;
  access_token: string;
  // The web-call URL the user opens in their browser to talk to the agent.
  // Retell hosts the page; pass `?accessToken=...` when navigating.
  call_url: string;
}
