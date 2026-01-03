import { generateIntakeQuestions } from "@/lib/intake/questions";
import { detectScenario } from "@/lib/data/scenario-config";
import type { IntakeQuestion } from "@/lib/intake/types";
import type { AgentPlan, UserContext } from "@/lib/types";

export type SessionStatus = "collecting" | "processing" | "needs_human" | "ready" | "error";

export interface IntakeSession {
  id: string;
  prompt: string;
  templateId?: string;
  scenarioId?: string;
  questions: IntakeQuestion[];
  answers: Record<string, string>;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  plan?: AgentPlan;
  hitlMessage?: string;
  missingFacts?: string[];
  templatePlan?: AgentPlan;
}

class SessionStore {
  private sessions = new Map<string, IntakeSession>();

  create(session: IntakeSession) {
    console.log(`Creating session ${session.id}, total sessions: ${this.sessions.size + 1}`);
    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string) {
    const session = this.sessions.get(sessionId);
    console.log(`Getting session ${sessionId}, found: ${!!session}, total sessions: ${this.sessions.size}`);
    if (!session) {
      console.log('Available sessions:', Array.from(this.sessions.keys()));
    }
    return session;
  }

  update(sessionId: string, updates: Partial<IntakeSession>) {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const next = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    } satisfies IntakeSession;
    this.sessions.set(sessionId, next);
    return next;
  }
}

// Use global variable to persist across hot reloads in development
declare global {
  var __sessionStore: SessionStore | undefined;
}

export const sessionStore = globalThis.__sessionStore ?? new SessionStore();

if (process.env.NODE_ENV === 'development') {
  globalThis.__sessionStore = sessionStore;
}

export async function initSession(prompt: string, templatePlan?: AgentPlan) {
  const sessionId = crypto.randomUUID();
  const defaults: Partial<UserContext> | undefined = templatePlan ? templatePlan.userContext : undefined;
  const detectedScenario = detectScenario({ prompt });
  const questions = await generateIntakeQuestions(prompt, defaults, detectedScenario);

  const baseAnswers: Record<string, string> = {
    initialPrompt: prompt,
  };

  if (detectedScenario) {
    baseAnswers.scenarioId = detectedScenario.id;
  }

  const session: IntakeSession = {
    id: sessionId,
    prompt,
    templateId: templatePlan?.sessionId,
    scenarioId: detectedScenario?.id,
    questions,
    status: "collecting",
    answers: baseAnswers,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    templatePlan: templatePlan ? structuredClone(templatePlan) : undefined,
  };

  sessionStore.create(session);
  return session;
}
