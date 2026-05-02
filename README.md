# Company Brain

Infrastructure that learns how a company works internally by **interviewing its employees** — not by reading its docs.

V1 focus: a 7-minute voice interview with each employee builds a knowledge graph of the organization. New hires query the Brain in natural language to get the exact person, contact, and procedure for any operational question (e.g. *"who do I ask for Salesforce access?"*).

## Architecture (V1)

```
Phase 1 — Discovery
  org_chart.csv → People skeleton
                ↓
       Schedule Agent (Google Calendar)
                ↓
       Interview Agent (Retell + Claude Sonnet 4.6)
                ↓
       Transcript
                ↓
       Post-Interview Agent (Claude Opus 4.7 + extended thinking)
                ↓
       Skills File (knowledge graph)

Phase 2 — Trojan Horse
  Employee query → Router (Haiku) → sub-graph
                                         ↓
                           Q&A Agent (Opus + extended thinking + caching)
                                         ↓
                           Answer with citations & follow-ups
```

## Stack

- **Backend:** Python 3.12, FastAPI, Anthropic SDK, deployed on Render
- **Frontend:** Next.js 16, TypeScript, Tailwind, deployed on Vercel
- **DB / vector:** Supabase + pgvector
- **Voice:** Retell.ai (Claude Sonnet 4.6, voice 11labs-Adrian, español rioplatense)
- **Phone:** Twilio Argentina (outbound calls), Google Meet fallback
- **Calendar:** Google Calendar API (service account + domain-wide delegation)
- **Embeddings:** Voyage 3 large (1024-dim)

## Models

| Component | Model |
|---|---|
| Q&A agent | `claude-opus-4-7` (fallback `claude-opus-4-6`) |
| Post-interview extractor | `claude-opus-4-7` + extended thinking |
| Interview agent (Retell) | `claude-sonnet-4-6` |
| Router (entity selection) | `claude-haiku-4-5` |

## Layout

```
backend/
  agents/         # interview, post_interview, router, qa, schedule
  channels/       # web, gchat, whatsapp adapters (pluggable)
  tools/          # Anthropic tool schemas
  utils/          # claude_client, supabase_client, loaders, merge
  models/         # Pydantic — entity + Skills File schemas
  eval/           # 8-case test suite (CI gate)
  scripts/        # build_brain, ask CLI
  main.py         # FastAPI app + Retell webhook + SSE
frontend/         # Next.js app
sample_data/      # demo org chart + 3 synthetic interview transcripts
```

## Quickstart (dev)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # fill in keys
python -m scripts.build_brain   # ingest sample data
python -m scripts.ask "¿A quién le pido acceso a Salesforce?"
```

## Eval gate

Before any deploy: `python -m eval.run_eval`. All 8 cases must pass.

## Status

Pre-MVP. Building for YC Summer 2026 application (deadline 4 mayo 2026).
