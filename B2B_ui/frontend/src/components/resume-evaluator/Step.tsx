'use client';

import React from 'react';
import {
  UploadCloud,
  FileText,
  Image,
  Cpu,
  CheckCircle,
  Loader2,
  Clock,
  LucideIcon,
} from 'lucide-react';
import { EvaluationStep, StepStatus } from '@/types/resumeEvaluator';

interface StepProps {
  step: EvaluationStep;
  inline?: boolean;
}

const Step: React.FC<StepProps> = ({ step, inline = false }) => {
  // Icon mapping for each step
  const iconMap: Record<string, LucideIcon> = {
    Upload: UploadCloud,
    Parsability: FileText,
    OCR: Image,
    Parsing: Cpu,
    Grading: Clock,
    Completed: CheckCircle,
  };

  // Get the appropriate icon
  const IconComponent = iconMap[step.step] || Loader2;

  // Status styles
  const getStatusStyles = () => {
    switch (step.status) {
      case StepStatus.DONE:
        return inline ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10' : 'border-green-700 bg-green-900/10';
      case StepStatus.IN_PROGRESS:
        return inline ? 'border-brand-blue-300 dark:border-brand-purple-700 bg-brand-blue-50 dark:bg-brand-purple-900/20' : 'border-brand-purple-700 bg-brand-purple-900/20';
      case StepStatus.PENDING:
      default:
        return inline ? 'border-brand-gray-300 dark:border-brand-gray-700 bg-brand-gray-100 dark:bg-brand-gray-700' : 'border-brand-gray-700 bg-brand-gray-700';
    }
  };

  const getStatusTextColor = () => {
    switch (step.status) {
      case StepStatus.DONE:
        return inline ? 'text-green-700 dark:text-green-400' : 'text-green-400';
      case StepStatus.IN_PROGRESS:
        return inline ? 'text-brand-blue-700 dark:text-brand-purple-300' : 'text-brand-purple-300';
      case StepStatus.FAILED:
        return inline ? 'text-brand-red-700 dark:text-brand-red-400' : 'text-brand-red-400';
      case StepStatus.PENDING:
      default:
        return inline ? 'text-brand-gray-600 dark:text-brand-gray-400' : 'text-brand-gray-400';
    }
  };

  const getStatusText = () => {
    switch (step.status) {
      case StepStatus.DONE:
        return 'Done';
      case StepStatus.IN_PROGRESS:
        return 'In progress';
      case StepStatus.FAILED:
        return 'Failed';
      case StepStatus.PENDING:
      default:
        return 'Pending';
    }
  };

  const getIconColor = () => {
    switch (step.status) {
      case StepStatus.DONE:
        return inline ? 'text-green-700 dark:text-green-400' : 'text-green-400';
      case StepStatus.IN_PROGRESS:
        return inline ? 'text-brand-blue-700 dark:text-brand-purple-300' : 'text-brand-purple-300';
      case StepStatus.FAILED:
        return inline ? 'text-brand-red-700 dark:text-brand-red-400' : 'text-brand-red-400';
      case StepStatus.PENDING:
      default:
        return inline ? 'text-brand-gray-600 dark:text-brand-gray-400' : 'text-brand-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-4 transition-all duration-300 ease-out">
      {/* Icon Container */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border ${getStatusStyles()} transition-all duration-300 ease-out`}
      >
        <IconComponent className={`h-5 w-5 ${getIconColor()} transition-colors duration-300`} />
      </div>

      {/* Content */}
      <div className="flex-1 transition-all duration-300 ease-out">
        {/* Step name and status */}
        <div className="flex items-baseline justify-between">
          <div className={`font-medium transition-colors duration-300 ${inline ? 'text-brand-gray-900 dark:text-white' : 'text-white'}`}>{step.step}</div>
          <div
            className={`text-xs font-medium ${getStatusTextColor()} transition-colors duration-300`}
          >
            {getStatusText()}
          </div>
        </div>
        {/* Timestamp */}
        <div className={`mt-1 text-xs transition-colors duration-300 ${inline ? 'text-brand-gray-600 dark:text-brand-gray-400' : 'text-brand-gray-400'}`}>{step.time}</div>
      </div>
    </div>
  );
};

export default Step;
