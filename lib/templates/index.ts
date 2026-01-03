import { MOCK_PLAN } from "@/lib/mockData";
import type { AgentPlan } from "@/lib/types";

export interface TemplateSummary {
  id: string;
  title: string;
  description: string;
  icon: string;
  suggestedPrompt: string;
}

interface TemplateDefinition extends TemplateSummary {
  plan: AgentPlan;
}

const TEMPLATES: TemplateDefinition[] = [
  {
    id: "h1b-document-kit",
    title: "What documents do I need for my H-1B visa application?",
    description: "Step-by-step intake and evidence checklist for cap-subject H-1B filings.",
    icon: "Clock",
    suggestedPrompt: "I am an F-1 OPT graduate changing to an H-1B. What documents do I need?",
    plan: MOCK_PLAN,
  },
];

export function listTemplates(): TemplateSummary[] {
  return TEMPLATES.map(({ plan: _plan, ...summary }) => summary);
}

export function getTemplatePlan(id: string): AgentPlan | null {
  const definition = TEMPLATES.find((template) => template.id === id);
  if (!definition) {
    return null;
  }
  return structuredClone(definition.plan);
}
