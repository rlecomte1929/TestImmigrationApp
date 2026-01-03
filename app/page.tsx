'use client';

import { FormEvent, useState, type ElementType } from "react";
import { ArrowUp, Clock, FileText, GraduationCap, Plane } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LandingHeader from "@/components/landing/LandingHeader";
import QuestionFlow from "@/components/onboarding/QuestionFlow";
import Dashboard from "@/components/dashboard/DashboardRoot";
import LoadingAnimation from "@/components/ui/loading-animation";
import type { IntakeQuestion } from "@/lib/intake/types";
import type { AgentPlan } from "@/lib/types";

interface TemplateCard {
  icon: ElementType;
  title: string;
  description: string;
  templateId?: string;
  suggestedPrompt?: string;
}

const templateCards: TemplateCard[] = [
  {
    icon: Clock,
    title: "What documents do I need for my H-1B visa application?",
    description: "Preloaded intake and checklist for cap-subject employees.",
    templateId: "h1b-document-kit",
    suggestedPrompt: "I am an F-1 OPT graduate starting an H-1B. What documents do I need?",
  },
  { icon: FileText, title: "How long does the green card process take?", description: "" },
  { icon: GraduationCap, title: "Can I work while on an F-1 student visa?", description: "" },
  { icon: Plane, title: "What are the requirements for a tourist visa extension?", description: "" },
  { icon: Clock, title: "How do I transfer my H-1B to a new employer?", description: "" },
  { icon: FileText, title: "What is the EB-1 visa category?", description: "" },
  { icon: GraduationCap, title: "Can I change from F-1 to H-1B status?", description: "" },
  { icon: Plane, title: "What are the O-1 visa requirements?", description: "" },
  { icon: Clock, title: "How do I apply for a visa renewal?", description: "" },
  { icon: FileText, title: "What is premium processing?", description: "" },
  { icon: GraduationCap, title: "Can I study part-time on a student visa?", description: "" },
  { icon: Plane, title: "What are the L-1 visa options?", description: "" },
  { icon: Clock, title: "How long can I stay after my visa expires?", description: "" },
  { icon: FileText, title: "What is the difference between EB-2 and EB-3?", description: "" },
  { icon: GraduationCap, title: "Can I bring my family on my visa?", description: "" },
  { icon: Plane, title: "What are the requirements for citizenship?", description: "" },
  {
    icon: FileText,
    title: "482 nomination refused as 'not a genuine position' — prepare AAT appeal",
    description: "Deadlines, dual lodgement, evidence, legal submissions",
    suggestedPrompt:
      "My 482 nomination was refused for 'genuine position'. Help me prepare an AAT appeal with deadlines, dual lodgement, an evidence bundle (BAS, payroll, org chart, ANZSCO mapping, LMT) and case distinctions.",
  },
  {
    icon: Plane,
    title: "Nurse from the Philippines moving to Berlin — step-by-step work visa plan",
    description: "Embassy appointment, recognition (Anerkennung), Anmeldung, residence permit, insurance",
    suggestedPrompt:
      "I am a nurse from the Philippines moving to Berlin for work. Generate a deadline-first plan covering embassy appointment (Manila/VFS), recognition (Anerkennung), arrival steps (Anmeldung, residence permit), and health insurance, with official sources and a timeline.",
  },
];

export default function HomePage() {
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [defaultAnswers, setDefaultAnswers] = useState<Record<string, string>>({});
  const [view, setView] = useState<"landing" | "intake" | "loading" | "dashboard">("landing");
  const [loadingStage, setLoadingStage] = useState<"preparing" | "processing" | "generating">("preparing");
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = view === "loading";

  const handleStart = async (promptValue: string, templateId?: string) => {
    if (!promptValue.trim() && !templateId) return;
    setError(null);
    setPlan(null);
    setLoadingStage("preparing");
    setView("loading");

    try {
      const response = await fetch("/api/intake/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptValue, templateId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to begin intake");
      }

      setSessionId(payload.sessionId);
      setQuestions(payload.questions ?? []);
      setDefaultAnswers(payload.defaultAnswers ?? {});
      
      // Small delay for smooth transition
      setTimeout(() => {
        setView("intake");
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setView("landing");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;
    handleStart(input.trim());
  };

  const handleTemplateClick = (template: TemplateCard) => {
    const promptValue = template.suggestedPrompt || template.title;
    setInput(promptValue);
    handleStart(promptValue, template.templateId);
  };

  const handleOnboardingComplete = async (answers: Record<string, string>) => {
    if (!sessionId) return;
    setLoadingStage("processing");
    setView("loading");
    setError(null);

    // Simulate stage progression
    setTimeout(() => setLoadingStage("generating"), 2000);

    try {
      const response = await fetch("/api/intake/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate plan");
      }

      setPlan(payload.plan as AgentPlan);
      
      // Small delay before showing dashboard
      setTimeout(() => {
        setView("dashboard");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setView("landing");
    }
  };

  if (view === "loading") {
    return <LoadingAnimation stage={loadingStage} />;
  }

  if (view === "dashboard" && plan) {
    return <Dashboard plan={plan} />;
  }

  if (view === "intake" && questions.length > 0) {
    return (
      <QuestionFlow
        initialPrompt={input}
        questions={questions}
        defaultAnswers={defaultAnswers}
        onComplete={handleOnboardingComplete}
        onBack={() => setView("landing")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <div className="flex items-center justify-center min-h-screen px-4 pt-20 pb-12">
        <div className="w-full max-w-[900px] space-y-14">
          <div className="text-center space-y-5">
            <h1 className="text-5xl md:text-6xl font-instrument font-semibold tracking-[-0.02em]">
              Your new life starts here, bureaucracy simplified.
            </h1>
            <p className="text-lg text-muted-foreground max-w-[600px] mx-auto leading-relaxed">
              AI-powered immigration guidance to help you navigate visa applications with confidence.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md py-2">
              {error}
            </div>
          )}

          <div className="max-w-[720px] mx-auto relative">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative p-1.5 rounded-2xl bg-gray-50 border">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="What can I help you with today? (e.g., I want to move to Australia for work)"
                  className="h-[180px] text-lg p-6 pb-16 bg-white border-0 focus:ring-0 focus:outline-none transition-all rounded-2xl resize-none leading-relaxed"
                  aria-label="Visa needs input"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isSubmitting}
                  className="absolute right-6 bottom-6 h-12 w-12 rounded-xl bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
                >
                  <ArrowUp className="w-6 h-6" />
                </Button>
              </div>
            </form>
          </div>

          <div className="relative overflow-hidden">
            <h2 className="text-lg font-medium mb-6 text-center">Explore use cases</h2>

            <div className="absolute left-0 top-12 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-12 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            <div className="flex gap-4 animate-scroll-left">
              {templateCards.map((template, index) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={`${template.title}-${index}`}
                    className="w-[240px] p-5 h-[140px] cursor-pointer transition-all shadow-sm border border-border hover:border-foreground group flex-shrink-0"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <div className="flex flex-col items-start h-full gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm leading-snug line-clamp-4">
                        {template.title}
                      </p>
                    </div>
                  </Card>
                );
              })}

              {templateCards.map((template, index) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={`${template.title}-duplicate-${index}`}
                    className="w-[240px] p-5 h-[140px] cursor-pointer transition-all shadow-sm border border-border hover:border-foreground group flex-shrink-0"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <div className="flex flex-col items-start h-full gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm leading-snug line-clamp-4">
                        {template.title}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
