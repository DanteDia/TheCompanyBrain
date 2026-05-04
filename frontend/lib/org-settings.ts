// Per-organization preferences stored in localStorage. The admin Settings
// page writes these; other pages (e.g. /interview/[id]) read them.
//
// We can't export helpers from app/admin/settings/page.tsx because Next.js
// App Router restricts page.tsx exports to a fixed allow-list (default,
// metadata, generateMetadata, viewport, …). Hence this dedicated module.

export type OrgLanguage = "en" | "es";

export function orgLangKey(orgId: string): string {
  return `cb-org-language-${orgId}`;
}

export function getOrgLanguage(orgId: string): OrgLanguage {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(orgLangKey(orgId));
  return v === "es" ? "es" : "en";
}

export function setOrgLanguage(orgId: string, lang: OrgLanguage): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(orgLangKey(orgId), lang);
}
