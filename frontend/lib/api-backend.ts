// Thin typed client for the Company Brain backend.

import type { Answer, InterviewsResponse, SkillsFile } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail: string;
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text();
    }
    throw new ApiError(res.status, `${res.status} ${res.statusText} — ${detail}`);
  }
  return (await res.json()) as T;
}

export async function ask(
  query: string,
  opts?: { organization_id?: string; thread_id?: string; user_email?: string }
): Promise<Answer> {
  return request<Answer>("/api/ask", {
    method: "POST",
    body: JSON.stringify({ query, ...opts }),
  });
}

export async function getSkillsFile(organization_id?: string): Promise<SkillsFile> {
  const qs = organization_id ? `?organization_id=${encodeURIComponent(organization_id)}` : "";
  return request<SkillsFile>(`/api/skills-file${qs}`);
}

export async function getInterviews(organization_id?: string): Promise<InterviewsResponse> {
  const qs = organization_id ? `?organization_id=${encodeURIComponent(organization_id)}` : "";
  return request<InterviewsResponse>(`/api/interviews${qs}`);
}

export async function buildBrain(organization_id?: string): Promise<{ ok: boolean; processed: number }> {
  return request("/api/build-brain", {
    method: "POST",
    body: JSON.stringify({ organization_id }),
  });
}

export async function uploadOrgChart(
  file: File,
  organization_id: string
): Promise<{ ok: boolean; people_loaded: number; total_in_brain: number }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("organization_id", organization_id);
  fd.append("organization_name", organization_id);
  // Don't set Content-Type — browser injects multipart boundary.
  const res = await fetch(`${API_URL}/api/upload-org-chart`, { method: "POST", body: fd });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export async function initiateCall(
  employee_id: string,
  organization_id?: string
): Promise<{ ok: boolean; call_id: string; agent_id: string }> {
  return request("/api/call/initiate", {
    method: "POST",
    body: JSON.stringify({ employee_id, organization_id }),
  });
}

export { ApiError, API_URL };
