# 🏛️ BureauAI — AI Agents for Legal Workflows

Visa and immigration law is complex, fragmented, and expensive to navigate. Each country has its own forms, deadlines, and systems — often hidden across multiple embassy or tribunal websites.

BureauAI builds retrieval-only, lawyer-in-the-loop AI agents that turn confusing government procedures into cited, step-by-step plans, checklists, and timelines — without hallucination or speculation.

## 🧰 Powered by

<img src="public\nodejs-ar21.svg" alt="Next.js" height="40"/>
<img src="public\OpenAI-black-wordmark.svg" alt="OpenAI" height="40"/>
<img src="public\weaviate-seeklogo.svg" alt="Weaviate" height="40"/>
<img src="public\supabase-logo-wordmark--light.svg" alt="Supabase" height="40"/>
<img src="https://www.aci.dev/images/header/logo-header.svg" alt="ACI.dev logo" height="40" />
<img src="public\logoblack.svg" alt="Lovable" height="30"/>
<img src="public\firecrawl-logo-with-fire.png" alt="Firecrawl" height="40"/>

## 💡 Overview

Legal workflows demand accuracy, not creativity. BureauAI eliminates hallucinations with retrieve-only generation — agents that assemble cited information from official sources, then hand results to a human reviewer for approval and action.

### What BureauAI Does

- **Intake**: guided questions collect relevant facts (jurisdiction, visa type, deadlines, documents)
- **Retrieve-only generation**: searches curated Weaviate embeddings and official legal sources
- **Structured output**: produces cited plans, evidence checklists, and timeline workflows
- **Human-in-the-loop**: a reviewer verifies before sending or exporting

## ⚙️ Core Features

- 🧭 **Retrieve-only architecture**: "No source → no answer."
- 🔍 **Curated retrieval pipelines**: Official, verified sources only (gov, tribunal, legislation)
- 🧑‍⚖️ **Lawyer-in-the-loop review**: Human validation before submission
- 📅 **Deadline automation**: Add statutory timelines to Google Calendar in one click
- 📨 **Exportable outputs**: Email complete cited plans securely
- 💬 **Explain-as-you-go UI**: Hover to reveal plain-English definitions of legal terms
- 📱 **Responsive design**: Clean, mobile-first chat experience

## 🧠 Architecture

| Layer | Description |
|-------|-------------|
| Frontend | Lovable + Next.js 14 (App Router) + TypeScript + shadcn/ui + Tailwind |
| Agents & LLMs | OpenAI (structured JSON, deterministic outputs) Agents |
| Vector DB | Weaviate (vetted legal corpus embeddings + Vector DB) |
| Search / Scrape | Google Custom Search API + Firecrawl |
| Serverless Proxy | Supabase Edge Function (streamed completions) |
| Email & Calendar | Nodemailer SMTP + Gate22 MCP integrations |
| Safety Guardrails | Retrieve-only generation, inline citations, structured normalization |

## 🧩 End-to-End Flow

1. Prompt or template selection
2. Dynamic intake form captures relevant facts
3. Retrieval pipeline:
   - Query Weaviate (curated embeddings)
   - Fallback to Google + Firecrawl for missing context
   - Classify data into process, evidence, requirements, case law
4. Synthesis: structured JSON plan with citations and deadlines
5. Presentation: visual dashboard of steps, checklists, and citations
6. Review & export: send via email or add deadlines to calendar

## 🔒 Safety & Grounding

- **Retrieve-only**: no output without a source
- **Inline citations**: every claim linked to an official publication
- **Normalization**: deduped, consistent sectioning
- **Transparency**: hover explanations clarify reasoning

## 🧱 Getting Started

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Add your credentials:

```makefile
OPENAI_API_KEY=
WEAVIATE_URL=
WEAVIATE_API_KEY=
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=
FIRECRAWL_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### Populate database

```bash
npm run populate-db
```

### Run development server

```bash
npm run dev
```

→ http://localhost:3000

## 🧾 API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/intake/start` | Begin session, return intake questions |
| `POST /api/intake/complete` | Orchestrate retrieval & generate plan |
| `POST /api/email-report` | Send cited plan via SMTP or MCP Gmail |
| `supabase/functions/chat-assistant` | Stream completions with safety guardrails |

## 🚀 Pitch Summary

**Problem**: Legal and visa workflows are opaque, fragmented, and too risky for generative AI hallucinations.

**Solution**: Retrieve-only AI agents that structure verified, cited workflows — with a human-in-the-loop for review.

**Impact**: Makes complex legal processes accessible, verifiable, and safe to automate.

**Vision**: A scalable library of trusted AI legal agents for any jurisdiction — grounded in law, not guesswork.

## 🧭 Roadmap

- 🌍 Expand jurisdiction coverage (UK, AU, EU, US, CA)
- ⚖️ Extend case law and tribunal corpora
- 📄 Auto-generated PDF packs (Checklist, Timeline)
- 🔗 Integrate more MCP tools (Google Drive, DocuSign, Calendar)
- 🧪 Add audit trail and reviewer verification system
## ⚠️ Disclaimer

BureauAI provides general legal information, not legal advice. Always verify details with official sources and consult a qualified professional before acting.

---

**"Retrieve truth, not guesswork."**

Made with 🏛️ by the BureauAI Team
