# Frontend ↔ Backend integration notes

This frontend currently runs against **mock data** (see `lib/mock-data.ts`) so the demo is robust even if the backend is down. The wiring to the real backend is laid out and ready — it just hasn't been switched on yet.

## Files that map to Dante's backend

| File | What it is | Status |
|---|---|---|
| `lib/api-backend.ts` | Typed client for the FastAPI endpoints (`/api/ask`, `/api/skills-file`, `/api/interviews`, `/api/build-brain`). Originally `lib/api.ts` from the previous frontend — preserved here untouched. | ready, not used yet |
| `lib/types-backend.ts` | Pydantic-mirrored types matching `backend/models/schemas.py`. Originally `lib/types.ts` from the previous frontend. | ready, not used yet |
| `.env.local.example` | `NEXT_PUBLIC_API_URL` config | kept as-is |
| `vercel.json` | Vercel config | kept as-is |

## Files that drive the current (mock) demo

- `lib/types.ts` — type system used by current components (Person/Tool/QAAnswer/etc.). Some types overlap with `types-backend.ts`; those should be merged when we wire the real backend.
- `lib/mock-data.ts` — synthetic dataset (BIND Bank, 12 employees, 3 demo scenarios, 22 integrations).
- `app/ask/page.tsx` — calls `matchDemoQuery()` from `mock-data.ts` instead of `api-backend.ask()`.

## To switch from mock to real backend

1. In `app/ask/page.tsx`, replace the `matchDemoQuery` lookup with:

   ```ts
   import { ask } from "@/lib/api-backend";
   const answer = await ask(question, { user_email: user.email });
   ```

2. Reconcile `lib/types.ts` with `lib/types-backend.ts`. Backend types win — adapt the components to the backend shape (mainly `QAAnswer` -> `Answer`, fields renamed: `summary` instead of `answer`, `person_to_contact` instead of inferring from entities, `follow_ups` with `text/why` instead of plain strings).

3. The AnswerCard variants (success / policy / conflict / gap) currently key off custom fields. The backend's `Answer` doesn't model those — needs a small mapping:
   - If `insufficient_information === true` -> render gap variant
   - If multiple sources / contradictions in `citations` -> render conflict variant
   - If `procedure` filled -> render policy variant
   - Default -> success variant

4. Same wiring for `/admin` pages: replace `mock-data.ts` reads with `getSkillsFile()` and `getInterviews()` from `api-backend.ts`.

5. Keep a `?demo=true` URL flag that forces mock mode — useful as fallback during the YC demo if the backend is down.

## Running

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# -> http://localhost:3000
```

Local dev points at `http://localhost:8000` for the backend (see `.env.local.example`).

## Surfaces

- `/` — landing (BrainNetwork visualization, rotating headline, integrations grid, ES/EN toggle)
- `/ask` — Q&A web app, 4 demo scenarios via mock matcher
- `/admin/*` — admin dashboard (overview, integrations, interviews, upload), password-gated (`1234` for demo)
- `/brain/*` — Brain Explorer (people table with drawer, glossary)
