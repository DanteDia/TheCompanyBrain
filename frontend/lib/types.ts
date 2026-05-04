// Tipos del dominio de Company Brain
// Mirror del schema en backend/models/schemas.py

export interface EvidenceSpan {
  source_type: "interview" | "document" | "org_chart" | "manual_edit";
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
  direct_reports?: string[];
  top_collaborators?: string[];
  current_projects?: string[];
  expertise_areas?: string[];
  interviewed?: boolean;
  evidence?: EvidenceSpan[];
}

export interface Tool {
  id: string;
  name: string;
  purpose: string;
  owners?: string[];
  used_by_areas?: string[];
  access_path_id?: string;
  evidence?: EvidenceSpan[];
}

export interface AccessPath {
  id: string;
  target_tool_id: string;
  requested_to: string;
  requires?: string[];
  sla?: string;
  evidence?: EvidenceSpan[];
}

export interface Process {
  id: string;
  name: string;
  description: string;
  owner_id?: string;
  participants?: string[];
  evidence?: EvidenceSpan[];
}

export interface InformalRule {
  id: string;
  description: string;
  context: string;
  learned_from?: string[];
  evidence?: EvidenceSpan[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  evidence?: EvidenceSpan[];
}

// === Q&A ===

export type AnswerType =
  | "person_lookup"
  | "access_path"
  | "routing"
  | "decision"
  | "definition"
  | "process_explanation"
  | "ownership"
  | "informal_rule"
  | "unknown";

export interface Citation {
  text: string;
  entity_type: string;
  entity_id: string;
  evidence: EvidenceSpan;
}

export interface ReferencedEntity {
  type: "Person" | "Tool" | "Process" | "GlossaryTerm" | "AccessPath";
  id: string;
  name: string;
}

export interface QAAnswer {
  answer: string;
  answer_type: AnswerType;
  entities_referenced: ReferencedEntity[];
  citations: Citation[];
  follow_up_suggestions?: string[];
  confidence: number;
  insufficient_information?: boolean;
  thinking_trace?: string;
  // Para multi-source / contradicciones
  conflicting_sources?: Array<{
    source: string;
    claim: string;
  }>;
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string; // for user
  answer?: QAAnswer; // for assistant
  timestamp: number;
}

// === Integraciones ===

export type IntegrationStatus = "active" | "available" | "coming_soon" | "connected";
export type IntegrationCategory = "channel" | "source" | "identity";

export type LogoKey =
  | "slack"
  | "google_chat"
  | "google_drive"
  | "gmail"
  | "ms_teams"
  | "ms_office"
  | "whatsapp"
  | "email"
  | "web_chat"
  | "voice"
  | "csv"
  | "notion"
  | "confluence"
  | "jira"
  | "salesforce"
  | "asana"
  | "clickup"
  | "monday"
  | "linear"
  | "zoom"
  | "figma"
  | "okta"
  | "gemini";

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  description: string;
  logoKey: LogoKey;
}
