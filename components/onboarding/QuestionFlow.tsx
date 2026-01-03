'use client';

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COUNTRY_OPTIONS, IMMIGRATION_STATUS_OPTIONS, Option } from "@/lib/intake/options";
import { IntakeQuestion } from "@/lib/intake/types";

const FALLBACK_QUESTIONS: IntakeQuestion[] = [
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

interface QuestionFlowProps {
  initialPrompt: string;
  questions?: IntakeQuestion[];
  defaultAnswers?: Record<string, string>;
  onComplete: (answers: Record<string, string>) => void | Promise<void>;
  onBack?: () => void;
}

function resolveOptions(question: IntakeQuestion): Option[] | undefined {
  if (question.options && question.options.length > 0) return question.options;
  if (question.id === "location") return COUNTRY_OPTIONS;
  if (question.id === "currentStatus") return IMMIGRATION_STATUS_OPTIONS;
  return undefined;
}

export default function QuestionFlow({
  initialPrompt,
  questions,
  defaultAnswers,
  onComplete,
  onBack,
}: QuestionFlowProps) {
  const questionList = useMemo(
    () => (questions && questions.length > 0 ? questions : FALLBACK_QUESTIONS),
    [questions]
  );

  const answerSeed = useMemo(
    () => defaultAnswers ?? {},
    [defaultAnswers]
  );

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(answerSeed);
  const [currentAnswer, setCurrentAnswer] = useState<string>(() => {
    const firstQuestion = questionList[0];
    if (!firstQuestion) return "";
    return answerSeed[firstQuestion.id] ?? "";
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const firstQuestion = questionList[0];
    if (firstQuestion?.type === "date") {
      const value = answerSeed[firstQuestion.id];
      return value ? new Date(value) : undefined;
    }
    return undefined;
  });

  useEffect(() => {
    setAnswers(answerSeed);
    const firstQuestion = questionList[0];
    if (!firstQuestion) {
      setCurrentQuestion(0);
      setCurrentAnswer("");
      setSelectedDate(undefined);
      return;
    }
    setCurrentQuestion(0);
    const initialValue = answerSeed[firstQuestion.id] ?? "";
    setCurrentAnswer(initialValue);
    if (firstQuestion.type === "date" && initialValue) {
      setSelectedDate(new Date(initialValue));
    } else {
      setSelectedDate(undefined);
    }
  }, [questionList, answerSeed]);

  const question = questionList[currentQuestion];
  const totalQuestions = questionList.length;
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = currentQuestion === totalQuestions - 1;
  const isFirstQuestion = currentQuestion === 0;

  if (!question) {
    return null;
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setCurrentAnswer(date ? date.toISOString() : "");
  };

  const persistAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: value,
    }));
  };

  const handleNext = async () => {
    persistAnswer(currentAnswer);

    if (isLastQuestion) {
      await onComplete({
        ...answers,
        [question.id]: currentAnswer,
        initialPrompt,
      });
      return;
    }

    const nextQuestionIndex = currentQuestion + 1;
    const nextQuestion = questionList[nextQuestionIndex];
    setCurrentQuestion(nextQuestionIndex);
    const nextAnswer = answers[nextQuestion.id] ?? "";
    setCurrentAnswer(nextAnswer);
    if (nextQuestion.type === "date" && nextAnswer) {
      setSelectedDate(new Date(nextAnswer));
    } else {
      setSelectedDate(undefined);
    }
  };

  const handleBackClick = () => {
    if (isFirstQuestion) {
      onBack?.();
      return;
    }

    const previousQuestionIndex = currentQuestion - 1;
    const previousQuestion = questionList[previousQuestionIndex];
    setCurrentQuestion(previousQuestionIndex);
    const previousAnswer = answers[previousQuestion.id] ?? "";
    setCurrentAnswer(previousAnswer);
    if (previousQuestion.type === "date" && previousAnswer) {
      setSelectedDate(new Date(previousAnswer));
    } else {
      setSelectedDate(undefined);
    }
  };

  const isAnswerValid = question.type === "date"
    ? Boolean(currentAnswer)
    : question.type === "radio"
      ? Boolean(currentAnswer)
      : question.required
        ? currentAnswer.trim().length > 0
        : true;

  const questionOptions = resolveOptions(question);
  const displayAnswer = question.type === "date" && currentAnswer ? format(new Date(currentAnswer), "PPP") : currentAnswer;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[600px] flex flex-col items-center space-y-8">
        {/* Initial Prompt Box */}
        <div className="fixed top-8 left-1/2 -translate-x-1/2 w-full max-w-[600px] px-4">
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{initialPrompt}</p>
            {Object.keys(answers).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(answers).map(([key, value]) => (
                  key !== "initialPrompt" && (
                    <div
                      key={key}
                      className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground"
                    >
                      <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " ").trim()}:</span>{" "}
                      <span>{value}</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-36 w-full space-y-8">
          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Step {currentQuestion + 1} of {totalQuestions}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2 bg-muted" />
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{question.question}</h2>
              {question.helperText && (
                <p className="text-sm text-muted-foreground">{question.helperText}</p>
              )}
            </div>

            {question.type === "text" && (
              <div className="space-y-3">
                <Label htmlFor={question.id} className="text-sm text-muted-foreground">
                  Please provide a detailed response
                </Label>
                <Input
                  id={question.id}
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder={question.placeholder}
                />
              </div>
            )}

            {question.type === "radio" && questionOptions && (
              <RadioGroup
                value={currentAnswer}
                onValueChange={setCurrentAnswer}
                className="space-y-3"
              >
                {questionOptions.map((option) => (
                  <Label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
                      currentAnswer === option.value
                        ? "border-foreground bg-muted"
                        : "border-border hover:border-foreground/40"
                    )}
                  >
                    <RadioGroupItem value={option.value} />
                    <span className="text-sm">{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            )}

            {question.type === "select" && questionOptions && (
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Select an option</Label>
                <Select value={currentAnswer} onValueChange={setCurrentAnswer}>
                  <SelectTrigger>
                    <SelectValue placeholder={question.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {questionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {question.type === "date" && (
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Pick a target date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentAnswer && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {displayAnswer || question.placeholder || "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={handleBackClick}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={!isAnswerValid}>
              {isLastQuestion ? "Continue" : "Next"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
