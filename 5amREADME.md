# Bureaucracy Navigator – 5?AM Status

_Last updated: 5?AM sprint, October?2025_

## What’s Working Now

### Curated Scenario Knowledge Base
- Three demo personas are fully pre-ingested into Weaviate:
  1. US citizen ? Australia (TSS 482 + SkillSelect)
  2. Brazilian professional ? Berlin (EU Blue Card)
  3. US student in UK ? Graduate visa
- Scraper chunks each official page into targeted sections (˜250–1800 chars) and stores metadata (fees, processing time, forms, official website, office hours, scenario id) for fast retrieval.
- `npm run populate-db` drives the ingestion pipeline (Google Custom Search ? Firecrawl ? Weaviate) with retry/backoff handling.

### Scenario-Aware Intake & Planning
- Intake startup detects scenarios (`detectScenario`) and seeds the dynamic questionnaire with scenario-specific questions.
- The orchestrator hits Weaviate first via `searchByScenario`; only falls back to live scraping if no curated match exists.
- Plan synthesis feeds scenario context into GPT-4o for richer, scenario-tuned instructions.

### Dashboard Detail View Upgrade
- `StepDetails` now renders dossier-style cards instead of the generic “official document” boilerplate.
  - Scenario badge + accent color, pulled from `scenarioId`.
  - Summary text comes from step description/excerpt rather than static copy.
  - Highlight chips surface fees, processing times, form numbers, and office hours.
  - Each source card shows a short excerpt plus metadata and official links.
  - Map section appears when we have a specific office address.

### Data Integrity & Tooling
- Firecrawl wrapper retries on 429/5xx with configurable delay; ingestion skips duplicate URLs and handles missing `doc.url` safely.
- Weaviate schema auto-migrates missing properties (adds `scenarioId`, `officeHours`, etc).
- Repo lint (`npm run lint`) is green.

## Runbook
1. **Populate DB**: `npm run populate-db` (requires env keys in `.env.local`).
2. **Dev Server**: `npm run dev` ? open `http://localhost:3000`.
3. **Best demo prompts**:
   - “I’m a US citizen moving to Australia for a skilled visa.”
   - “Brazilian engineer relocating to Berlin on an EU Blue Card.”
   - “US grad staying in the UK on the Graduate visa.”

## Upcoming Work
- **Google Calendar integration (next feature)**: wire the “Add to Calendar” action in StepDetails so prioritized tasks push structured events (deadlines, reminders) into the user’s Google Calendar via OAuth.
  - Consider leveraging existing plan metadata (`deadline`, `estimatedTime`, `scenarioId`) to prefill event titles, descriptions, and links back to the dashboard.

## Reference Files
- `lib/data/scenario-config.ts` – scenario definitions + detection logic.
- `lib/data/immigration-scraper.ts` – section chunking, metadata extraction.
- `lib/ai/weaviate.ts` – Weaviate client, schema, search functions.
- `lib/intake/questions.ts` – scenario-driven intake questions.
- `lib/intake/orchestrator.ts` – retrieval + plan synthesis pipeline.
- `components/dashboard/StepDetails.tsx` – updated dossier UI for steps.

Stay consistent with scenario metadata whenever you add new features (calendar, additional personas, etc.) so the dashboard continues to hydrate correctly.