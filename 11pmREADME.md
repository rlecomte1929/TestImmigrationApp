# Bureaucracy Navigator Backend & Agent Integration

_Last updated: 11pm sprint build_

## Goal
Stand up a Next.js-based backend and agent layer so the existing Bureaucracy Navigator design can run a deterministic, cited intake flow for complex government processes (e.g., H-1B visa), with human-in-the-loop escalation when facts are missing.

## What Was Built
- **Next.js migration**
  - Replaced the Vite React app with a Next.js (App Router) project while preserving the shadcn UI look and feel.
  - Added shared providers (`app/providers.tsx`) for React Query, tooltips, and toasters.
- **Landing → Intake → Dashboard flow**
  - Landing prompt/tiles now call `POST /api/intake/start` to create a session and fetch dynamic questions.
  - `QuestionFlow` consumes server-provided questions (fallbacks included) and posts answers back to `POST /api/intake/complete`.
  - The dashboard renders the agent-produced plan (plan summary, workstreams, checklist, timeline) instead of hard-coded mock data.
- **Template preload**
  - `lib/templates` exposes reusable plan templates (currently the H-1B “Document Kit”).
  - Selecting the template card fills the dashboard instantly using the same UI.
- **Agent orchestration**
  - `lib/intake/questions.ts` generates follow-up questions via OpenAI JSON schema.
  - `lib/intake/session-store.ts` maintains an in-memory fact pack per intake session.
  - `lib/intake/orchestrator.ts` runs search query generation, Firecrawl retrieval, OpenAI plan synthesis, and citation hydration.
  - The plan returns HITL flags when required facts/sources are missing; the dashboard surfaces this banner.
- **Chat panel**
  - Updated to use Next.js env vars (`NEXT_PUBLIC_SUPABASE_URL`, etc.) and remains wired to the Supabase Edge function (`supabase/functions/chat-assistant`).
- **Tooling**
  - `npm run lint` (Next.js ESLint) passes.
  - TypeScript configured via `tsconfig.json` with Next.js plugin.
  - Tailwind config trimmed to match the new directory structure.

## Environment Variables
Create `.env.local` (git-ignored) with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
FIRECRAWL_API_KEY=...
```

Rotate any keys previously pasted into transcripts before deployment.

## Directory Overview
- `app/` – Next.js routes and API endpoints (`/api/intake/start`, `/api/intake/complete`, template fetchers).
- `components/` – Client components (landing, onboarding, dashboard, shared shadcn wrappers).
- `hooks/` – Reusable hooks (`useTextSelection`, etc.).
- `integrations/` – Supabase client (retained for optional services).
- `lib/` – Agent logic (intake options, templates, session store, orchestrator) and shared types.
- `public/assets/` – Static images used by the dashboard.

## What Works Right Now
1. Landing prompt → dynamic intake questions → plan generation pipeline.
2. Template card loads the enriched H-1B plan with citations and sidebar metrics filled.
3. Dashboard highlights HITL requirements when sources are insufficient.
4. Client-side chat panel still streams responses from the Supabase function (requires `LOVABLE_API_KEY` in Supabase env).

## Suggested Next Steps
1. Persist sessions in Redis/Supabase instead of the in-memory map for multi-user support.
2. Seed Weaviate (or any vector store) with vetted government docs to augment Firecrawl.
3. Store plan outputs/version history for reproducibility and audits.
4. Add more templates (e.g., UK Graduate Visa) following the `AgentPlan` schema.
5. Expand error reporting & observability (Sentry/logging) around retrieval/synthesis tool calls.

## Local Development
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`, select a template or type a new prompt, answer the intake questions, and review the generated plan.

