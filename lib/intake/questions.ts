import { getOpenAI } from "@/lib/ai/openai";
import { COUNTRY_OPTIONS, IMMIGRATION_STATUS_OPTIONS } from "@/lib/intake/options";
import type { IntakeQuestion } from "@/lib/intake/types";
import type { ScenarioDefinition } from "@/lib/data/scenario-config";
import type { UserContext } from "@/lib/types";

const BASE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "visaType",
    type: "radio",
    question: "What type of visa are you applying for?",
    options: [
      { value: "h1b-work", label: "H-1B Work Visa" },
      { value: "f1-student", label: "F-1 Student Visa" },
      { value: "green-card", label: "Green Card" },
      { value: "b2-tourist", label: "B-2 Tourist Visa" },
      { value: "other", label: "Other" },
    ],
    required: true,
  },
  {
    id: "deadline",
    type: "date",
    question: "When do you need to complete your application?",
    placeholder: "Select date",
    required: true,
  },
  {
    id: "currentStatus",
    type: "select",
    question: "What is your current immigration status?",
    placeholder: "Select your immigration status",
    options: IMMIGRATION_STATUS_OPTIONS,
    required: true,
  },
  {
    id: "location",
    type: "select",
    question: "Where are you currently located?",
    placeholder: "Select your country",
    options: COUNTRY_OPTIONS,
    required: true,
  },
];

interface DynamicQuestionSchema {
  questions: {
    id: string;
    question: string;
    required?: boolean;
  }[];
}

function cloneQuestions(questions: IntakeQuestion[]): IntakeQuestion[] {
  return questions.map((question) => ({
    ...question,
    options: question.options ? [...question.options] : undefined,
  }));
}

function getScenarioSpecificQuestions(scenario: ScenarioDefinition): IntakeQuestion[] {
  switch (scenario.id) {
    case "usa-to-australia-skilled-worker":
      return [
        {
          id: "australiaSponsorStatus",
          type: "radio",
          question: "Do you already have an Australian employer willing to sponsor your visa?",
          options: [
            { value: "confirmed-sponsor", label: "Yes, sponsorship nomination is in progress or approved" },
            { value: "in-discussions", label: "I am interviewing / negotiating with employers" },
            { value: "no-sponsor", label: "No, I still need to secure a sponsor" },
          ],
          required: true,
        },
        {
          id: "anzscoOccupation",
          type: "text",
          question: "What occupation will you work in? Include your ANZSCO code if you know it.",
          required: true,
        },
        {
          id: "skillsAssessmentStatus",
          type: "radio",
          question: "Have you completed the required skills assessment or Australian licensing for that occupation?",
          options: [
            { value: "assessment-complete", label: "Yes, assessment/licensing is complete" },
            { value: "assessment-in-progress", label: "Assessment is scheduled or in progress" },
            { value: "assessment-not-started", label: "Not started yet" },
            { value: "assessment-not-required", label: "Not required for my occupation" },
          ],
        },
      ];
    case "brazil-to-berlin-residence":
      return [
        {
          id: "berlinEmploymentContract",
          type: "radio",
          question: "Do you already have a signed employment contract with a German employer?",
          options: [
            { value: "contract-signed", label: "Yes, contract is signed" },
            { value: "offer-letter", label: "I have an offer letter but contract not signed" },
            { value: "no-offer", label: "No, I am still searching" },
          ],
          required: true,
        },
        {
          id: "grossSalaryEur",
          type: "text",
          question: "What is your gross annual salary offer in euros (before taxes)?",
          placeholder: "e.g. 58,000",
          required: true,
        },
        {
          id: "degreeRecognitionStatus",
          type: "radio",
          question: "Has your university degree been recognised by German authorities (Anabin or ZAB)?",
          options: [
            { value: "recognised", label: "Yes, fully recognised" },
            { value: "in-progress", label: "Recognition is in progress" },
            { value: "not-recognised", label: "Not yet recognised" },
            { value: "not-applicable", label: "My role does not require recognition" },
          ],
        },
      ];
    case "us-graduate-visa-uk":
      return [
        {
          id: "courseCompletionNotified",
          type: "radio",
          question: "Has your university reported to UKVI that you successfully completed your course?",
          options: [
            { value: "reported", label: "Yes" },
            { value: "pending", label: "Not yet, but will be soon" },
            { value: "unsure", label: "Unsure" },
          ],
          required: true,
        },
        {
          id: "brpExpiryDate",
          type: "date",
          question: "When does your current Student visa or BRP expire?",
          required: true,
        },
        {
          id: "graduateDependants",
          type: "radio",
          question: "Are you planning to include dependants in your Graduate visa application?",
          options: [
            { value: "no-dependants", label: "No" },
            { value: "partner", label: "Yes, my partner" },
            { value: "partner-and-children", label: "Yes, partner and/or children" },
          ],
        },
      ];
    default:
      return [];
  }
}

function getRelevantBaseQuestions(prompt: string, scenario?: ScenarioDefinition): IntakeQuestion[] {
  const questions = cloneQuestions(BASE_QUESTIONS);

  if (scenario) {
    return questions.filter((question) => question.id !== "visaType");
  }

  const lowerPrompt = prompt.toLowerCase();

  if (
    lowerPrompt.includes("h1b") ||
    lowerPrompt.includes("h-1b") ||
    lowerPrompt.includes("f1") ||
    lowerPrompt.includes("f-1") ||
    lowerPrompt.includes("green card") ||
    lowerPrompt.includes("tourist visa") ||
    lowerPrompt.includes("germany") ||
    lowerPrompt.includes("uk") ||
    lowerPrompt.includes("canada")
  ) {
    return questions.filter((q) => q.id !== "visaType");
  }

  return questions;
}

export async function generateIntakeQuestions(
  prompt: string,
  defaults?: Partial<UserContext>,
  scenario?: ScenarioDefinition
): Promise<IntakeQuestion[]> {
  const baseQuestions = getRelevantBaseQuestions(prompt, scenario);
  const scenarioQuestions = scenario ? getScenarioSpecificQuestions(scenario) : [];
  const questions = [...scenarioQuestions, ...baseQuestions];

  if (defaults?.visaType) {
    const visaQuestion = questions.find((q) => q.id === "visaType");
    if (visaQuestion && !visaQuestion.options?.some((opt) => opt.value === defaults.visaType)) {
      visaQuestion.options = [
        { value: defaults.visaType, label: defaults.visaType },
        ...(visaQuestion.options ?? []),
      ];
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return questions;
  }

  try {
    const client = getOpenAI();
    const systemInstruction = scenario
      ? `You are an immigration intake specialist guiding a user through ${scenario.label}. Ask 2-3 precise follow-up questions that cover: ${
          scenario.intakeFocus?.join('; ') ?? 'key eligibility, timing, and document requirements'
        }. Make the questions concrete so we can pre-fill forms later.`
      : "You are an immigration intake specialist. Generate 2-3 SPECIFIC questions tailored to the user's exact situation that will help create a personalized action plan. Focus on practical details like purpose of move, qualifications, family situation, budget, timeline constraints. Make questions actionable and relevant to their specific visa/immigration goal.";

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "dynamic_questions",
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "question"],
                  properties: {
                    id: { type: "string" },
                    question: { type: "string" },
                    required: { type: "boolean" },
                  },
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: systemInstruction,
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            defaults,
            scenario: scenario
              ? {
                  id: scenario.id,
                  summary: scenario.summary,
                  focus: scenario.intakeFocus,
                }
              : undefined,
          }),
        },
      ],
    });

    const output = response.choices[0]?.message?.content;
    if (!output) {
      return questions;
    }

    const parsed = JSON.parse(output) as DynamicQuestionSchema;
    parsed.questions.slice(0, 3).forEach((q, index) => {
      if (!q.question) return;
      questions.push({
        id: q.id || `followup-${index + 1}`,
        type: "text",
        question: q.question,
        required: q.required ?? false,
      });
    });
  } catch (error) {
    console.error("Failed to generate dynamic intake questions", error);
  }

  return questions;
}

export function getBaseQuestions(): IntakeQuestion[] {
  return cloneQuestions(BASE_QUESTIONS);
}
