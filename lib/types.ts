export type VisaType = 
  | 'h1b-work'
  | 'f1-student'
  | 'green-card'
  | 'b2-tourist'
  | 'other';

export type StepStatus = 
  | 'complete' 
  | 'in-progress' 
  | 'pending' 
  | 'locked';

export type Priority = 'high' | 'medium' | 'low';

export interface Source {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  type: 'official' | 'lawyer-verified' | 'guide';
  publishedDate?: string;
  lastVerified?: string;
  excerpt?: string;
  fees?: string;
  processingTime?: string;
  formNumbers?: string[];
  officialWebsite?: string;
  officeHours?: string;
  scenarioId?: string;
}

export interface Step {
  id: string;
  name: string;
  status: StepStatus;
  description?: string;
  priority?: Priority;
  deadline?: string;
  estimatedTime?: string;
  confidenceScore?: number;
  instructions?: string[];
  visualGuideUrl?: string;
  visualCaption?: string;
  documentRequired?: boolean;
  sources?: Source[];
  officeAddress?: string;
}

export interface Workstream {
  id: string;
  title: string;
  icon: string;
  progress: number;
  steps: Step[];
  successRate?: {
    successful: number;
    total: number;
  };
}

export interface UserContext {
  visaType: string;
  deadline: string;
  currentStatus: string;
  location: string;
  initialPrompt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: StepStatus;
  notes?: string;
  relatedStepId?: string;
  sourceId?: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  sourceId?: string;
}

export interface PlanSummary {
  headline: string;
  overview: string[];
  keyMetrics?: {
    label: string;
    value: string;
  }[];
}

export interface AgentPlan {
  sessionId: string;
  userContext: UserContext;
  planSummary: PlanSummary;
  workstreams: Workstream[];
  checklist: ChecklistItem[];
  timeline: TimelineItem[];
  sources: Source[];
  hitl?: {
    required: boolean;
    message: string;
    missingFacts?: string[];
  };
}
