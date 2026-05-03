"""Centralized settings — single source of truth for env vars.

Use `from backend.config import settings` everywhere. Don't read os.environ directly.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # ── App ──────────────────────────────────────────────────────────────────
    environment: str = "development"
    log_level: str = "INFO"
    default_timezone: str = "America/Argentina/Buenos_Aires"
    default_org_id: str = "banco_demo"

    # ── LLM provider switch ──────────────────────────────────────────────────
    # "anthropic" → uses native Anthropic SDK (extended thinking + caching available)
    # "openrouter" → uses OpenAI-compatible SDK at openrouter.ai (no thinking, no caching)
    # "auto" → anthropic if ANTHROPIC_API_KEY is set, else openrouter
    llm_provider: str = "auto"

    # ── Anthropic native ─────────────────────────────────────────────────────
    anthropic_api_key: str = ""

    # ── OpenRouter (alternative; works with the same model names) ────────────
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_app_url: str = "https://github.com/DanteDia/TheCompanyBrain"
    openrouter_app_name: str = "Company Brain"

    # ── Models (work with both providers — names are normalized internally) ──
    model_qa: str = "claude-opus-4-7"
    model_qa_fallback: str = "claude-opus-4-6"
    model_extractor: str = "claude-opus-4-7"
    model_interview: str = "claude-sonnet-4-6"
    model_router: str = "claude-haiku-4-5"

    # ── Supabase ─────────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""

    # ── Voyage embeddings ────────────────────────────────────────────────────
    voyage_api_key: str = ""
    voyage_model: str = "voyage-3-large"

    # ── Retell ───────────────────────────────────────────────────────────────
    retell_api_key: str = ""
    retell_agent_id: str = ""
    retell_webhook_url: str = ""

    # ── Twilio ───────────────────────────────────────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # ── Slack ────────────────────────────────────────────────────────────────
    slack_bot_token: Optional[str] = None  # xoxb-... (Bot User OAuth Token)
    slack_signing_secret: Optional[str] = None  # for verifying request signatures

    # ── Google Calendar ──────────────────────────────────────────────────────
    gcp_service_account_json_path: Optional[str] = None
    gcp_service_account_json: Optional[str] = Field(
        None, description="raw JSON inline — use this in Render, path in dev"
    )
    calendar_organizer_email: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def resolved_provider(self) -> str:
        """Resolve "auto" → anthropic if key present, else openrouter."""
        if self.llm_provider != "auto":
            return self.llm_provider.lower()
        if self.anthropic_api_key:
            return "anthropic"
        if self.openrouter_api_key:
            return "openrouter"
        return "anthropic"  # will error at first call with a clear message


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
