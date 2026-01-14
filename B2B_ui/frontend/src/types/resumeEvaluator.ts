/**
 * Resume Evaluator Types
 * Defines data structures for resume evaluation progress tracking
 */

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'inprogress',
  DONE = 'done',
  FAILED = 'failed',
}

export interface EvaluationStep {
  step: string;
  status: StepStatus;
  time: string;
}

export interface ActivityLogEntry {
  action: string;
  timestamp: string;
}

export interface EvaluationData {
  steps: EvaluationStep[];
  totalSteps: number;
  completedSteps: number;
  progressPercent: number;
  inProgressStep: EvaluationStep | null;
  activityLog: ActivityLogEntry[];
  estimatedTimeRemaining: string;
}

export interface ResumeEvaluationProgressProps {
  data?: EvaluationData;
  isLoading?: boolean;
  onRetry?: () => void;
}

export type ResumeEvaluationStep = 'upload' | 'parsability' | 'parsability_check' | 'OCR' | 'parsing' | 'grading' | 'completed' | 'failed';

export type ResumeEvaluationStatus = 'in progress' | 'in_progress' | 'completed' | 'failed';

// Rich suggestion object from backend
export interface SuggestionItem {
  id: string;
  title: string;
  description: string;
  example?: string;
  category: string;
  priority: number;
  status: string;
}

export interface ResumeStatusPayload {
  evaluationId: string;
  step: ResumeEvaluationStep;
  status: ResumeEvaluationStatus;
  details?: string;
  fileId: string;
  fileUrl?: string;
  jobName?: string;
  progress?: number;
  scores?: {
    overall: number;
    ats: number;
    keyword: number;
    format: number;
  };
  suggestions?: SuggestionItem[];  // Updated: now uses rich suggestion objects
  review?: string;          // Added: full review text
  error?: string;
  timestamp: string;
}

// Resume data structure from backend
export interface ResumeData {
  category: string;
  priority: number;
  status: string;
}

// Resume data structure from backend
export interface ResumeData {
  rawText: string;
  personalInfo: {
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    name?: string;
    address?: string;
  };
  experience: Array<{
    company?: string;
    endDate?: string;
  }>;
  education: Array<{
    institution?: string;
    degree?: string;
  }>;
  skills: string[];
  projects: Array<{
    name?: string;
  }>;
}

export interface EvaluationResult {
  scores: {
    overall: number;
    ats: number;
    keyword: number;
    format: number;
    experience?: number;
  };
  suggestions: SuggestionItem[];
  review: string;
}

export interface StartEvaluationResponse {
  evaluationId: string;
  fileId: string;
  fileUrl: string;
  resumeData?: ResumeData;
  // Backend sends these with different names
  atsScore?: number;
  keywordScore?: number;
  formatScore?: number;
  overallScore?: number;
  // Transformed scores (for internal use)
  scores?: {
    overall: number;
    ats: number;
    keyword: number;
    format: number;
    experience?: number;
  };
  suggestions?: SuggestionItem[];
  review?: string;
}
