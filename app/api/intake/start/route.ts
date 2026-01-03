import { NextRequest, NextResponse } from "next/server";
import { initSession, sessionStore } from "@/lib/intake/session-store";
import { getTemplatePlan } from "@/lib/templates";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const promptInput = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const templateId = typeof body.templateId === "string" ? body.templateId : undefined;

  const templatePlan = templateId ? getTemplatePlan(templateId) : null;

  const prompt = promptInput || templatePlan?.planSummary.headline || templatePlan?.userContext.initialPrompt || "";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const session = await initSession(prompt, templatePlan ?? undefined);

  if (templatePlan) {
    sessionStore.update(session.id, {
      templatePlan,
      answers: {
        ...session.answers,
        visaType: templatePlan.userContext.visaType,
        deadline: templatePlan.userContext.deadline,
        currentStatus: templatePlan.userContext.currentStatus,
        location: templatePlan.userContext.location,
      },
    });
  }

  return NextResponse.json({
    sessionId: session.id,
    questions: session.questions,
    defaultAnswers: templatePlan
      ? {
          visaType: templatePlan.userContext.visaType,
          deadline: templatePlan.userContext.deadline,
          currentStatus: templatePlan.userContext.currentStatus,
          location: templatePlan.userContext.location,
        }
      : undefined,
  });
}
