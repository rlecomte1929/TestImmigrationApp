import { NextRequest, NextResponse } from "next/server";
import { buildPlan } from "@/lib/intake/orchestrator";
import { sessionStore } from "@/lib/intake/session-store";
import { detectScenario } from "@/lib/data/scenario-config";
import type { AgentPlan } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const answers = body.answers && typeof body.answers === "object" ? body.answers as Record<string, string> : {};

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const mergedAnswers = { ...session.answers, ...answers };

  if (session.templatePlan) {
    const updated = sessionStore.update(sessionId, {
      answers: mergedAnswers,
    });

    const plan = structuredClone(session.templatePlan);
    plan.sessionId = sessionId;
    plan.userContext = {
      ...plan.userContext,
      visaType: mergedAnswers.visaType ?? plan.userContext.visaType,
      deadline: mergedAnswers.deadline ?? plan.userContext.deadline,
      currentStatus: mergedAnswers.currentStatus ?? plan.userContext.currentStatus,
      location: mergedAnswers.location ?? plan.userContext.location,
      initialPrompt: updated.prompt,
    };

    const status = plan.hitl?.required ? "needs_human" : "ready";

    sessionStore.update(sessionId, {
      status,
      plan,
    });

    return NextResponse.json({ status, plan });
  }

  const detectedScenario = detectScenario({ prompt: session.prompt, answers: mergedAnswers });
  if (detectedScenario?.id) {
    mergedAnswers.scenarioId = detectedScenario.id;
  }

  const processingSession = sessionStore.update(sessionId, {
    answers: mergedAnswers,
    status: "processing",
    scenarioId: detectedScenario?.id ?? session.scenarioId,
  });

  try {
    const plan = await buildPlan(processingSession);
    const status = "ready"; // Always mark as ready, no HITL

    sessionStore.update(sessionId, {
      status,
      plan,
    });

    return NextResponse.json({ status, plan });
  } catch (error) {
    console.error("Plan generation failed", error);
    const fallbackPlan = {
      sessionId,
      userContext: {
        visaType: mergedAnswers.visaType ?? "",
        deadline: mergedAnswers.deadline ?? "",
        currentStatus: mergedAnswers.currentStatus ?? "",
        location: mergedAnswers.location ?? "",
        initialPrompt: processingSession.prompt,
      },
      planSummary: {
        headline: "Manual review required",
        overview: [
          "We could not automatically locate authoritative sources for this scenario. Please verify details with a human expert before proceeding.",
        ],
      },
      workstreams: [],
      checklist: [],
      timeline: [],
      sources: [],
      hitl: {
        required: true,
        message: "Automatic retrieval failed. Please collect relevant government links manually and re-run the intake.",
      },
    } satisfies AgentPlan;

    sessionStore.update(sessionId, { status: "needs_human", plan: fallbackPlan });

    return NextResponse.json({ status: "needs_human", plan: fallbackPlan });
  }
}
