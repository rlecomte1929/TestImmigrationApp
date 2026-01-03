import { firecrawlScrape } from "@/lib/ai/firecrawl";
import { googleSearch, type SearchResult } from "@/lib/ai/google-search";
import { getOpenAI } from "@/lib/ai/openai";
import { weaviateClient, type ImmigrationSource } from "@/lib/ai/weaviate";
import { detectScenario, getScenarioById } from "@/lib/data/scenario-config";
import type { IntakeSession } from "@/lib/intake/session-store";
import type { AgentPlan, Source } from "@/lib/types";

interface QuerySchema {
  queries: string[];
}

interface PlanStepSchema {
  id: string;
  name: string;
  status: string;
  description?: string;
  priority?: string;
  deadline?: string;
  estimatedTime?: string;
  confidenceScore?: number;
  instructions?: string[];
  documentRequired?: boolean;
  sources?: string[];
}

interface PlanWorkstreamSchema {
  id: string;
  title: string;
  icon: string;
  progress: number;
  successRate?: {
    successful: number;
    total: number;
  };
  steps: PlanStepSchema[];
}

interface PlanSchema {
  sessionId: string;
  planSummary: {
    headline: string;
    overview: string[];
    keyMetrics?: Array<{ label: string; value: string }>;
  };
  workstreams: PlanWorkstreamSchema[];
  checklist: AgentPlan["checklist"];
  timeline: AgentPlan["timeline"];
  hitl?: {
    required: boolean;
    message: string;
    missingFacts?: string[];
  };
}

interface SourceDraft extends Source {
  excerpt?: string;
  markdown?: string;
  scenarioId?: string;
}

function toGovFirst(results: SearchResult[]): SearchResult[] {
  const gov = results.filter((result) => /\.(gov|gc\.ca|gov\.au|gov\.uk|gouv\.fr|admin\.ch)/i.test(result.url));
  const others = results.filter((result) => !gov.includes(result));
  return [...gov, ...others];
}

async function generateSearchQueries(session: IntakeSession): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [
      `${session.prompt} official requirements`,
      `${session.prompt} government guidance`,
    ];
  }

  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "queries",
          schema: {
            type: "object",
            properties: {
              queries: {
                type: "array",
                minItems: 1,
                maxItems: 4,
                items: { type: "string" },
              },
            },
            required: ["queries"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: "Produce targeted web search queries that will surface official (government) sources answering the immigration prompt. Return between 2 and 4 queries.",
        },
        {
          role: "user",
          content: JSON.stringify({ prompt: session.prompt, answers: session.answers }),
        },
      ],
    });

    const payload = response.choices[0]?.message?.content;
    if (!payload) return [];
    const json = JSON.parse(payload) as QuerySchema;
    return Array.from(new Set(json.queries.map((q) => q.trim()).filter(Boolean)));
  } catch (error) {
    console.error("Unable to generate search queries", error);
    return [];
  }
}

async function buildSourceSet(queries: string[], maxSources = 5): Promise<SourceDraft[]> {
  const collected: SourceDraft[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const results = toGovFirst(await googleSearch(query, 10));
      for (const result of results) {
        if (seen.has(result.url)) continue;
        seen.add(result.url);

        const doc = await firecrawlScrape(result.url);
        if (!doc) continue;

        const source: SourceDraft = {
          id: `source-${collected.length + 1}`,
          title: doc.title ?? result.title ?? result.url,
          url: doc.url,
          type: /\.gov/i.test(result.url) ? "official" : "guide",
          excerpt: result.snippet,
          markdown: doc.markdown,
        };
        collected.push(source);
        if (collected.length >= maxSources) {
          return collected;
        }
      }
    } catch (error) {
      console.error(`Failed to collect sources for query: ${query}`, error);
    }
  }

  return collected;
}

function buildFactPack(session: IntakeSession) {
  return {
    prompt: session.prompt,
    answers: session.answers,
  };
}

async function synthesizePlan(session: IntakeSession, sources: SourceDraft[]): Promise<PlanSchema> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = getOpenAI();
  const scenario = session.scenarioId
    ? getScenarioById(session.scenarioId)
    : detectScenario({ prompt: session.prompt, answers: session.answers });

  const systemLines = [
    "You are an expert immigration consultant. Create EXTREMELY detailed, step-by-step instructions that anyone can follow without prior knowledge.",
    "",
    "REQUIREMENTS:",
    "- Each workstream must have 3-4 detailed steps (never just 1 step)",
    "- Write instructions as if explaining to someone who has never done this before",
    "- Include exact website navigation: \"Click X button\", \"Fill out Y field\", \"Upload Z document\"",
    "- Provide specific costs, timeframes, and requirements from sources",
    "- Tailor advice to the user's specific situation from their intake answers",
    "",
    "INSTRUCTION STYLE EXAMPLES:",
    "BAD: \"Apply for visa online\"",
    "GOOD: \"Go to immi.homeaffairs.gov.au -> Click 'Apply for a visa' -> Select 'Work visas' -> Choose 'Temporary Skill Shortage visa (subclass 482)' -> Create ImmiAccount -> Fill the application paying $1,330 fee -> Upload passport scan, photo, skills assessment\"",
    "",
    "BAD: \"Get documents ready\"",
    "GOOD: \"Obtain skills assessment from TRA (trades) or ACS (IT) by submitting qualifications + $500 fee -> Takes 6-8 weeks -> Download certificate -> Scan as PDF under 5MB\"",
    "",
    "Make each step so detailed that someone could complete it immediately after reading.",
    "",
    "CRITICAL: Use correct country-specific offices and addresses:",
    "- Australia visas: Australian Embassy or Consulate, Department of Home Affairs offices",
    "- Germany visas: German Embassy or Consulate, Auslaenderbehoerde offices",
    "- UK visas: UK Visa Application Centre, Home Office",
    "- NEVER use US offices (USCIS, US Embassy) for non-US visas",
    "",
    "Extract exact office addresses and contact details from the scraped sources.",
  ];

  if (scenario) {
    systemLines.push(
      "",
      "SCENARIO CONTEXT:",
      `- ${scenario.label}`,
      `- ${scenario.summary}`,
      scenario.intakeFocus && scenario.intakeFocus.length > 0
        ? `- Focus areas: ${scenario.intakeFocus.join('; ')}`
        : undefined,
      "- Prioritize curated scenario sources before falling back to generic search results."
    );
  }

  // Scenario-specific legal overrides for AAT appeal of 482 nomination refusal
  if (scenario?.id === 'au-482-nomination-refusal-aat-appeal') {
    systemLines.push(
      "",
      "LEGAL SCENARIO OVERRIDES:",
      "- Start with a bold heading and a 1–2 line summary.",
      "- Include a '28-day AAT deadline' with a no-extension warning and show how to calculate it from the refusal date.",
      "- Require 'dual lodgement' explanations: nomination review and linked visa review (if applicable), each with form, fee, and channel.",
      "- Generate these workstreams with 2–4 steps each: (1) Deadlines & Dual Lodgement (2) Evidence Bundle & Exhibits (3) Legal Submissions & Case Distinctions (4) Hearing Preparation (5) Post-Decision Pathways.",
      "- Evidence Bundle must list: BAS/P&L/payroll, org chart, position description, duty logs, LMT proof, ANZSCO mapping, third-party accountant letter.",
      "- Add a short SFIC scaffold: Facts, Issues, Contentions; include 1–2 case distinctions with AAT citations.",
      "- Every step should cite at least one source; prefer AAT/Home Affairs/legislation.gov.au; may include AustLII decisions.",
      "- Do not invent statistics; only include success rates if explicitly present in sources.",
    );
  }

  // Scenario-specific overrides for PH nurse → Berlin skilled worker
  if (scenario?.id === 'ph-nurse-berlin-skilled-worker') {
    systemLines.push(
      '',
      'SCENARIO OVERRIDES (PH nurse → Berlin):',
      '- Produce a deadline-first plan with concrete dates when possible.',
      '- Required workstreams (2–4 steps each): (1) Embassy Appointment & Visa Application (Manila/VFS) (2) Recognition (Anerkennung) & Language (3) Arrival in Berlin: Anmeldung & Residence Permit (4) Health Insurance & Employment Onboarding.',
      '- Each step must include: exact forms/pages to visit, required documents, and deadline anchors (e.g., “within 14 days of moving in” for Anmeldung; “apply well before visa expiry” for residence permit).',
      '- Use official sources: German Embassy Manila, VFS Global Philippines (Germany), Berlin Immigration Office pages, Recognition portals (Make-it-in-Germany, Anerkennung-in-Deutschland).',
      '- Clarify blocked account requirements: typically for students/job seekers; for a signed employment contract, proof of income may suffice — cite embassy page text if present.',
      '- Generate timeline items with relative deadlines (e.g., “T0: contract signed; T0+3 days: book embassy appointment; Arrival+14 days: Anmeldung; VisaExpiry-8 weeks: residence permit application”).',
      '- No invented statistics; provide processing time ranges if present in sources; otherwise, omit or mark as “varies by workload”.'
    );
  }

  const systemPrompt = systemLines.filter(Boolean).join('\n');

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "agent_plan",
        schema: {
          type: "object",
          required: ["sessionId", "planSummary", "workstreams", "checklist", "timeline"],
          properties: {
            sessionId: { type: "string" },
            planSummary: {
              type: "object",
              required: ["headline", "overview"],
              properties: {
                headline: { type: "string" },
                overview: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" },
                },
                keyMetrics: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["label", "value"],
                    properties: {
                      label: { type: "string" },
                      value: { type: "string" },
                    },
                  },
                },
              },
            },
            workstreams: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: {
                type: "object",
                required: ["id", "title", "icon", "progress", "steps"],
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  icon: { type: "string" },
                  progress: { type: "number" },
                  successRate: {
                    type: "object",
                    properties: {
                      successful: { type: "number" },
                      total: { type: "number" },
                    },
                  },
                  steps: {
                    type: "array",
                    minItems: 2,
                    maxItems: 5,
                    items: {
                      type: "object",
                      required: ["id", "name", "status"],
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        status: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string" },
                        deadline: { type: "string" },
                        estimatedTime: { type: "string" },
                        confidenceScore: { type: "number" },
                        instructions: {
                          type: "array",
                          items: { type: "string" },
                        },
                        documentRequired: { type: "boolean" },
                        requiredDocuments: {
                          type: "array",
                          items: { type: "string" },
                        },
                        officialWebsite: { type: "string" },
                        formNumber: { type: "string" },
                        fee: { type: "string" },
                        processingTime: { type: "string" },
                        officeAddress: { type: "string" },
                        sources: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            checklist: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "label", "status"],
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  status: { type: "string" },
                  notes: { type: "string" },
                  relatedStepId: { type: "string" },
                  sourceId: { type: "string" },
                },
              },
            },
            timeline: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "title", "dueDate"],
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  dueDate: { type: "string" },
                  sourceId: { type: "string" },
                },
              },
            },
            hitl: {
              type: "object",
              properties: {
                required: { type: "boolean" },
                message: { type: "string" },
                missingFacts: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify({
          sessionId: session.id,
          factPack: buildFactPack(session),
          sources: sources.map((source) => ({
            id: source.id,
            title: source.title,
            url: source.url,
            excerpt: source.excerpt,
            markdown: source.markdown,
          })),
          scenario: scenario ? {
            id: scenario.id,
            summary: scenario.summary,
            focus: scenario.intakeFocus,
          } : undefined,
        }),
      },
    ],
  });

  const payload = response.choices[0]?.message?.content;
  console.log("OpenAI plan synthesis response:", payload);
  
  if (!payload) {
    throw new Error("OpenAI did not return plan payload");
  }

  try {
    const plan = JSON.parse(payload) as PlanSchema;
    console.log("Parsed plan:", JSON.stringify(plan, null, 2));
    return plan;
  } catch (parseError) {
    console.error("Failed to parse OpenAI response as JSON:", parseError);
    console.error("Raw payload:", payload);
    throw new Error("OpenAI returned invalid JSON");
  }
}

async function searchWeaviateFirst(session: IntakeSession): Promise<SourceDraft[]> {
  try {
    console.log("🔍 Searching Weaviate for curated immigration data...");

    const scenario = session.scenarioId
      ? getScenarioById(session.scenarioId)
      : detectScenario({ prompt: session.prompt, answers: session.answers });

    let weaviateSources: ImmigrationSource[] = [];

    if (scenario) {
      console.log(`🔎 Detected scenario: ${scenario.id}`);
      weaviateSources = await weaviateClient.searchByScenario(scenario.id, 24);

      if (weaviateSources.length === 0) {
        const fallbackQuery = `${scenario.label} ${scenario.summary}`;
        console.log(
          `ℹ️ No direct scenario matches found, retrying with similarity search for "${fallbackQuery}"`
        );
        weaviateSources = await weaviateClient.searchSimilar(fallbackQuery, 15, 0.6);
      }
    } else {
      const searchQuery = `${session.prompt} ${Object.values(session.answers).join(' ')}`.trim();
      weaviateSources = await weaviateClient.searchSimilar(searchQuery, 12, 0.75);
    }

    if (weaviateSources.length > 0) {
      console.log(`✅ Loaded ${weaviateSources.length} curated sources from Weaviate`);

      return weaviateSources.map((source, index) => ({
        id: `weaviate-${index + 1}`,
        title: source.title,
        url: source.url,
        type: "official" as const,
        excerpt: `${source.content.substring(0, 200)}...`,
        markdown: source.content,
        fees: source.fees,
        processingTime: source.processingTime,
        formNumbers: source.formNumbers,
        officialWebsite: source.officialWebsite,
        scenarioId: source.scenarioId,
      }));
    }

    console.log("ℹ️ No relevant sources found in Weaviate DB, falling back to web search");
    return [];
  } catch (error) {
    console.error("❌ Failed to search Weaviate:", error);
    return [];
  }
}

export async function buildPlan(session: IntakeSession): Promise<AgentPlan> {
  // First, try to find relevant data in our curated Weaviate database
  let sources = await searchWeaviateFirst(session);
  
  // If no relevant curated data found, fall back to web scraping
  if (sources.length === 0) {
    console.log("🌐 Falling back to web scraping...");
    const queries = await generateSearchQueries(session);
    sources = await buildSourceSet(queries);
  }

  if (sources.length === 0) {
    throw new Error("No sources collected from either Weaviate or web scraping");
  }

  const plan = await synthesizePlan(session, sources);

  const normalizedSources: Source[] = sources.map(({ markdown, ...rest }) => ({ ...rest }));
  const sourceMap = new Map(normalizedSources.map((source) => [source.id, source]));

  // Heuristic enrichment: attach relevant sources and deadlines when the model omitted them
  const enrichStep = (step: any, scenarioId?: string) => {
    // Attach sources if missing or empty: choose by simple keyword/category match
    const needsSources = !step.sources || (Array.isArray(step.sources) && step.sources.length === 0);
    if (needsSources) {
      const name: string = String(step.name || '').toLowerCase();
      const wantCategories: string[] = [];
      if (/(embassy|vfs|appointment|visa application)/i.test(name)) wantCategories.push('appointments', 'requirements');
      if (/(anmeldung|registration|resident address)/i.test(name)) wantCategories.push('residence_registration');
      if (/(recognition|anerkennung|qualification|nursing)/i.test(name)) wantCategories.push('recognition');
      if (/(health|insurance|krankenkasse|gkv)/i.test(name)) wantCategories.push('health_insurance');

      const pool = normalizedSources.filter((s) => !scenarioId || s.scenarioId === scenarioId || s.countryTo?.toLowerCase() === 'germany');
      const ranked = pool.sort((a, b) => {
        const ac = wantCategories.includes(String(a.category));
        const bc = wantCategories.includes(String(b.category));
        if (ac && !bc) return -1;
        if (!ac && bc) return 1;
        // Fallback: simple substring score by title
        const as = (a.title || '').toLowerCase().includes(name) ? 1 : 0;
        const bs = (b.title || '').toLowerCase().includes(name) ? 1 : 0;
        return bs - as;
      });
      const picked = ranked.slice(0, 3).map((s) => s.id);
      if (picked.length > 0) step.sources = picked;
    }

    // Add deadline hints for PH nurse → Berlin scenario if missing
    if (scenarioId === 'ph-nurse-berlin-skilled-worker') {
      if (!step.deadline || String(step.deadline).trim().length === 0) {
        const name = String(step.name || '').toLowerCase();
        if (/anmeldung|register/.test(name)) {
          step.deadline = 'Within 14 days of moving into your Berlin address (Anmeldung).';
        } else if (/residence permit|aufenthalt/.test(name)) {
          step.deadline = 'Apply at least 8 weeks before your visa expires (LEA appointment lead times vary).';
        } else if (/embassy|vfs|appointment/.test(name)) {
          step.deadline = 'Book as soon as your contract is signed; aim within 3–7 days due to queues.';
        }
      }
    }
    return step;
  };

  const hydratedWorkstreams = (plan.workstreams || []).map((workstream) => ({
    ...workstream,
    steps: (workstream.steps || [])
      .map((s) => enrichStep({ ...s }, session.scenarioId))
      .map((step) => ({
        ...step,
        sources: step.sources
          ? step.sources
              .map((sourceId: string) => sourceMap.get(sourceId))
              .filter((item): item is Source => Boolean(item))
          : undefined,
      })),
  }));

  const finalPlan = {
    sessionId: session.id,
    userContext: {
      visaType: session.answers.visaType ?? "",
      deadline: session.answers.deadline ?? "",
      currentStatus: session.answers.currentStatus ?? "",
      location: session.answers.location ?? "",
      initialPrompt: session.prompt,
    },
    planSummary: plan.planSummary || { headline: "Plan Generated", overview: ["Processing complete"] },
    workstreams: hydratedWorkstreams,
    checklist: plan.checklist || [],
    timeline: plan.timeline || [],
    sources: normalizedSources,
    hitl: undefined, // Disable HITL for now
  } satisfies AgentPlan;

  console.log("Final plan being returned:", JSON.stringify(finalPlan, null, 2));
  return finalPlan;
}
