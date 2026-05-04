"use client";

import { Check, Plus, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Integration, LogoKey } from "@/lib/types";
import { INTEGRATIONS_DEFS } from "@/lib/mock-data";
import { t, type Locale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-toggle";
import {
  SlackLogo,
  GoogleChatLogo,
  GoogleDriveLogo,
  GmailLogo,
  MicrosoftTeamsLogo,
  MicrosoftLogo,
  WhatsAppLogo,
  EmailLogo,
  WebChatLogo,
  VoiceWaveformLogo,
  CSVLogo,
  NotionLogo,
  ConfluenceLogo,
  JiraLogo,
  SalesforceLogo,
  AsanaLogo,
  ClickUpLogo,
  MondayLogo,
  LinearLogo,
  ZoomLogo,
  FigmaLogo,
  OktaLogo,
  GeminiLogo,
} from "./brand-logos";

const LOGO_MAP: Record<LogoKey, React.ComponentType<{ className?: string }>> = {
  slack: SlackLogo,
  google_chat: GoogleChatLogo,
  google_drive: GoogleDriveLogo,
  gmail: GmailLogo,
  ms_teams: MicrosoftTeamsLogo,
  ms_office: MicrosoftLogo,
  whatsapp: WhatsAppLogo,
  email: EmailLogo,
  web_chat: WebChatLogo,
  voice: VoiceWaveformLogo,
  csv: CSVLogo,
  notion: NotionLogo,
  confluence: ConfluenceLogo,
  jira: JiraLogo,
  salesforce: SalesforceLogo,
  asana: AsanaLogo,
  clickup: ClickUpLogo,
  monday: MondayLogo,
  linear: LinearLogo,
  zoom: ZoomLogo,
  figma: FigmaLogo,
  okta: OktaLogo,
  gemini: GeminiLogo,
};

export function IntegrationCard({ integration }: { integration: Integration }) {
  const [locale] = useLocale();
  const isComing = integration.status === "coming_soon";
  const isActive = integration.status === "active" || integration.status === "connected";
  const Logo = LOGO_MAP[integration.logoKey];

  // Look up bilingual description
  const def = INTEGRATIONS_DEFS.find((d) => d.id === integration.id);
  const description = def ? def.description[locale] : integration.description;

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-white p-4 transition-all",
        isComing
          ? "border-stone-200 opacity-55"
          : "border-stone-200 hover:border-stone-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0 bg-white border border-stone-200/60",
            isComing && "grayscale"
          )}
        >
          {Logo && <Logo className="h-6 w-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium text-sm text-stone-900 truncate">
              {integration.name}
            </div>
            <StatusBadge status={integration.status} locale={locale} />
          </div>
          <p className="text-xs text-stone-500 mt-1.5 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {!isComing && (
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-stone-400">
            {t(`integrations.category.${integration.category}`, locale)}
          </span>
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
              <Check className="h-3 w-3 text-green-700" strokeWidth={2.5} />
              {t("integrations.cta.configured", locale)}
            </span>
          ) : (
            <button className="inline-flex items-center gap-1 text-[11px] text-stone-700 hover:text-accent-600 transition-colors font-medium">
              <Plus className="h-3 w-3" />
              {t("integrations.cta.connect", locale)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  locale,
}: {
  status: Integration["status"];
  locale: Locale;
}) {
  if (status === "active" || status === "connected") {
    return (
      <Badge variant="success" className="text-[10px] !py-0">
        {t("integrations.badge.active", locale)}
      </Badge>
    );
  }
  if (status === "coming_soon") {
    return (
      <Badge variant="outline" className="text-[10px] !py-0">
        <Clock className="h-2.5 w-2.5" /> {t("integrations.badge.coming_soon", locale)}
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="text-[10px] !py-0">
      {t("integrations.badge.available", locale)}
    </Badge>
  );
}
