'use client';

import React, { useEffect } from 'react';
import { Loader2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import Step from './Step';
import { EvaluationData, StepStatus, EvaluationResult } from '@/types/resumeEvaluator';
import { useAnimatedProgress } from '@/hooks/useAnimatedProgress';
import { useResumeEvaluationWebSocket, ConnectionStatus } from '@/hooks/useResumeEvaluationWebSocket';

interface ResumeEvaluationProgressProps {
  data?: EvaluationData;
  autoStart?: boolean;
  evaluationId?: string | null;
  inline?: boolean;
  onComplete?: (result: EvaluationResult) => void;
  onError?: (error: string) => void;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

// Add smooth animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}

// Default dummy data
const defaultData: EvaluationData = {
  steps: [
    { step: 'Upload', status: StepStatus.DONE, time: '0:03' },
    { step: 'Parsability', status: StepStatus.DONE, time: '0:05' },
    { step: 'OCR', status: StepStatus.IN_PROGRESS, time: '0:12' },
    { step: 'Parsing', status: StepStatus.PENDING, time: '—' },
    { step: 'Grading', status: StepStatus.PENDING, time: '—' },
    { step: 'Completed', status: StepStatus.PENDING, time: '—' },
  ],
  totalSteps: 6,
  completedSteps: 2,
  progressPercent: 40,
  inProgressStep: { step: 'OCR', status: StepStatus.IN_PROGRESS, time: '0:12' },
  activityLog: [
    { action: 'OCR started on page 1', timestamp: '0:10' },
    { action: 'Parsability check passed', timestamp: '0:05' },
    { action: 'File uploaded (resume.pdf)', timestamp: '0:03' },
  ],
  estimatedTimeRemaining: '~0:18',
};

const ResumeEvaluationProgress: React.FC<
  ResumeEvaluationProgressProps
> = ({ data = defaultData, autoStart = true, evaluationId, inline = false, onComplete, onError, onConnectionStatusChange }) => {
  const {
    evaluationData: wsData,
    connectionStatus,
    isConnected,
    error: wsError,
  } = useResumeEvaluationWebSocket({
    evaluationId: evaluationId ?? null,
    onComplete,
    onError,
    autoConnect: !!evaluationId,
  });

  // Notify parent component when connection status changes
  useEffect(() => {
    if (onConnectionStatusChange) {
      onConnectionStatusChange(connectionStatus);
    }
  }, [connectionStatus, onConnectionStatusChange]);

  const evaluationData = wsData || data || defaultData;

  const shouldUseAnimation = !isConnected && autoStart && !evaluationId;

  const {
    currentStepIndex,
    completedSteps,
    progressPercent,
    isAnimating,
    startAnimation,
  } = useAnimatedProgress({
    steps: evaluationData.steps,
    delayPerStep: 2000,
    debounceDelay: 50,
  });

  // Auto-start animation if not using WebSocket
  useEffect(() => {
    if (shouldUseAnimation) {
      startAnimation();
    }
  }, [shouldUseAnimation, startAnimation]);

  // Get animated steps data - mark completed and in-progress steps
  const animatedSteps = shouldUseAnimation
    ? evaluationData.steps.map((step, idx) => {
        if (idx < completedSteps) {
          return { ...step, status: StepStatus.DONE };
        } else if (idx === completedSteps && isAnimating) {
          return { ...step, status: StepStatus.IN_PROGRESS };
        }
        return { ...step, status: StepStatus.PENDING };
      })
    : evaluationData.steps;

  // Get current in-progress step
  const currentStep = shouldUseAnimation
    ? animatedSteps[currentStepIndex] || evaluationData.inProgressStep
    : evaluationData.inProgressStep;

  // Use animated progress or WebSocket progress
  const displayProgressPercent = shouldUseAnimation ? progressPercent : evaluationData.progressPercent;

  return (
    <div className={inline ? "p-6 font-sans md:p-12" : "min-h-screen bg-brand-gray-900 p-6 font-sans text-white md:p-12"}>
      <div className={`flex w-full flex-col items-center justify-center ${inline ? 'text-brand-gray-900 dark:text-white' : 'text-white'}`}>
        <div className="w-full max-w-4xl">
          {/* Header with Connection Status */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className={inline ? "text-sm text-brand-gray-600 dark:text-brand-gray-400" : "text-sm text-brand-gray-400"}>Evaluation</div>
              <div className={`text-2xl font-semibold ${inline ? 'text-brand-gray-900 dark:text-white' : 'text-white'}`}>
                Resume Evaluation Progress
              </div>
            </div>

            {evaluationId && (
              <div className="flex items-center gap-2">
                {connectionStatus === ConnectionStatus.CONNECTED && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-1 text-xs ${
                    inline 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                      : 'bg-green-900/20 text-green-400'
                  }`}>
                    <Wifi className="h-3 w-3" />
                    Live
                  </div>
                )}
                {connectionStatus === ConnectionStatus.CONNECTING && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-1 text-xs ${
                    inline 
                      ? 'bg-brand-blue-100 dark:bg-brand-blue-900/20 text-brand-blue-700 dark:text-brand-blue-400' 
                      : 'bg-brand-blue-900/20 text-brand-blue-400'
                  }`}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Connecting...
                  </div>
                )}
                {connectionStatus === ConnectionStatus.DISCONNECTED && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-1 text-xs ${
                    inline 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' 
                      : 'bg-yellow-900/20 text-yellow-400'
                  }`}>
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </div>
                )}
                {connectionStatus === ConnectionStatus.ERROR && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-1 text-xs ${
                    inline 
                      ? 'bg-brand-red-100 dark:bg-brand-red-900/20 text-brand-red-700 dark:text-brand-red-400' 
                      : 'bg-brand-red-900/20 text-brand-red-400'
                  }`}>
                    <AlertCircle className="h-3 w-3" />
                    Error
                  </div>
                )}
              </div>
            )}
          </div>

          {wsError && evaluationId && (
            <div className={`mb-4 rounded-lg border p-3 text-sm ${
              inline 
                ? 'border-brand-red-300 dark:border-brand-red-700 bg-brand-red-50 dark:bg-brand-red-900/20 text-brand-red-700 dark:text-brand-red-400' 
                : 'border-brand-red-700 bg-brand-red-900/20 text-brand-red-400'
            }`}>
              {wsError}
            </div>
          )}

          {/* Connecting Message */}
          {connectionStatus === ConnectionStatus.CONNECTING && evaluationId === 'connecting' && (
            <div className={`mb-4 rounded-lg border p-4 text-sm flex items-center gap-3 ${
              inline 
                ? 'border-brand-blue-300 dark:border-brand-blue-700 bg-brand-blue-50 dark:bg-brand-blue-900/20 text-brand-blue-700 dark:text-brand-blue-400' 
                : 'border-brand-blue-700 bg-brand-blue-900/20 text-brand-blue-400'
            }`}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>
                <div className="font-semibold">Connecting to server...</div>
                <div className="text-xs mt-1 opacity-80">
                  Establishing secure WebSocket connection for real-time updates
                </div>
              </div>
            </div>
          )}

          {/* Main Grid Layout */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left Panel: Timeline */}
            <div className="md:col-span-2">
              <div className={`rounded-2xl border shadow-sm p-6 ${
                inline 
                  ? 'border-brand-gray-200 dark:border-brand-gray-700 bg-white dark:bg-brand-gray-800' 
                  : 'border-brand-gray-700 bg-brand-gray-800'
              }`}>
                {/* Overall Progress Section */}
                <div className="mb-4 flex items-center justify-between">
                  <div className={inline ? "text-sm text-brand-gray-600 dark:text-brand-gray-400" : "text-sm text-brand-gray-400"}>Overall Progress</div>
                  <div className={`text-sm font-medium ${inline ? 'text-brand-blue-700 dark:text-brand-purple-300' : 'text-brand-purple-300'}`}>
                    {displayProgressPercent}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className={`mb-6 h-3 w-full overflow-hidden rounded-full ${inline ? 'bg-brand-gray-200 dark:bg-brand-gray-700' : 'bg-brand-gray-700'}`}>
                  <div
                    className="h-3 rounded-full bg-brand-purple-500 transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${displayProgressPercent}%`,
                      boxShadow: '0 0 8px rgba(168, 85, 247, 0.5)'
                    }}
                  />
                </div>

                {/* Steps List with Smooth Transitions */}
                <div className="space-y-4">
                  {animatedSteps.map((step, idx) => (
                    <div
                      key={step.step}
                      className="transition-all duration-300 ease-out"
                      style={{
                        animation: shouldUseAnimation && isAnimating
                          ? `fadeIn 0.4s ease-out ${idx * 50}ms forwards`
                          : 'none',
                        opacity: shouldUseAnimation && isAnimating && idx > completedSteps + 1 ? 0.6 : 1,
                      }}
                    >
                      <Step key={step.step} step={step} inline={inline} />
                    </div>
                  ))}
                </div>

                {/* Activity Log */}
                <div className={`mt-6 space-y-2 border-t pt-4 text-sm ${
                  inline 
                    ? 'border-brand-gray-200 dark:border-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-400' 
                    : 'border-brand-gray-700 text-brand-gray-400'
                }`}>
                  {evaluationData.activityLog.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div>{log.action}</div>
                      <div className={`text-xs ${inline ? 'text-brand-gray-500 dark:text-brand-gray-500' : 'text-brand-gray-500'}`}>
                        {log.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: Current Step */}
            <div className="md:col-span-1">
              <div className={`flex flex-col gap-4 rounded-2xl border shadow-sm p-6 ${
                inline 
                  ? 'border-brand-gray-200 dark:border-brand-gray-700 bg-white dark:bg-brand-gray-800' 
                  : 'border-brand-gray-700 bg-brand-gray-800'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className={inline ? "text-sm text-brand-gray-600 dark:text-brand-gray-400" : "text-sm text-brand-gray-400"}>Current Step</div>
                    <div className={`text-lg font-semibold ${inline ? 'text-brand-gray-900 dark:text-white' : 'text-white'}`}>
                      {currentStep
                        ? currentStep.step
                        : 'Waiting'}
                    </div>
                  </div>
                  <div className={inline ? "text-sm text-brand-gray-600 dark:text-brand-gray-400" : "text-sm text-brand-gray-400"}>ETA</div>
                </div>

                {/* Status Box */}
                <div className={`rounded-md p-3 ${
                  inline 
                    ? 'bg-brand-gray-100 dark:bg-brand-gray-700/50' 
                    : 'bg-brand-gray-700/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <Loader2 className={`h-5 w-5 flex-shrink-0 animate-spin ${inline ? 'text-brand-blue-700 dark:text-brand-purple-300' : 'text-brand-purple-300'}`} />
                    <div>
                      <div className={`text-sm ${inline ? 'text-brand-gray-900 dark:text-brand-gray-200' : 'text-brand-gray-200'}`}>
                        {currentStep
                          ? `${currentStep.step} — ${isConnected ? 'streaming live...' : 'analyzing...'}`
                          : 'idle'}
                      </div>
                      <div className={`text-xs ${inline ? 'text-brand-gray-600 dark:text-brand-gray-400' : 'text-brand-gray-400'}`}>
                        {isConnected
                          ? 'Real-time updates from server'
                          : 'This may take a few seconds depending on file size.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ETA Section */}
                <div className="flex items-center justify-between">
                  <div className={inline ? "text-sm text-brand-gray-600 dark:text-brand-gray-400" : "text-sm text-brand-gray-400"}>
                    Estimated time remaining
                  </div>
                  <div className={`text-sm font-medium ${inline ? 'text-brand-gray-900 dark:text-brand-gray-200' : 'text-brand-gray-200'}`}>
                    {evaluationData.estimatedTimeRemaining}
                  </div>
                </div>

                {evaluationId && (
                  <div className={`mt-4 border-t pt-4 text-xs ${
                    inline 
                      ? 'border-brand-gray-200 dark:border-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-400' 
                      : 'border-brand-gray-700 text-brand-gray-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span>Connection</span>
                      <span className={
                        isConnected ? 'text-green-400' : 'text-yellow-400'
                      }>
                        {connectionStatus}
                      </span>
                    </div>
                    {!isConnected && shouldUseAnimation && (
                      <div className="mt-2 text-yellow-400">
                        Using local animation (WebSocket unavailable)
                      </div>
                    )}
                    <div className={`mt-2 truncate ${inline ? 'text-brand-gray-500 dark:text-brand-gray-500' : 'text-brand-gray-500'}`}>
                      Evaluation ID: {evaluationId}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeEvaluationProgress;
