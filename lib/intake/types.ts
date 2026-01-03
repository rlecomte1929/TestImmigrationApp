import type { Option } from "@/lib/intake/options";

export type QuestionType = "text" | "radio" | "date" | "select";

export interface IntakeQuestion {
  id: string;
  type: QuestionType;
  question: string;
  placeholder?: string;
  options?: Option[];
  helperText?: string;
  required?: boolean;
}
