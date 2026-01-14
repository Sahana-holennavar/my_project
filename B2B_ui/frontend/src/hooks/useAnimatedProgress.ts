/**
 * Hook for managing animated step progression
 * Features: 2s delay per step, 50ms debouncing for multiple calls
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { EvaluationStep } from '@/types/resumeEvaluator';

export interface AnimationState {
  currentStepIndex: number;
  completedSteps: number;
  progressPercent: number;
  isAnimating: boolean;
  steps: EvaluationStep[];
}

interface UseAnimatedProgressOptions {
  steps: EvaluationStep[];
  delayPerStep?: number;
  debounceDelay?: number;
  onStepComplete?: (stepIndex: number, step: EvaluationStep) => void;
  onAnimationComplete?: () => void;
}

const STEP_DELAY = 2000; // 2 seconds per step
const DEBOUNCE_DELAY = 50; // 50ms debounce

export const useAnimatedProgress = ({
  steps,
  delayPerStep = STEP_DELAY,
  debounceDelay = DEBOUNCE_DELAY,
  onStepComplete,
  onAnimationComplete,
}: UseAnimatedProgressOptions) => {
  const [animationState, setAnimationState] = useState<AnimationState>({
    currentStepIndex: -1,
    completedSteps: 0,
    progressPercent: 0,
    isAnimating: false,
    steps,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isStartedRef = useRef(false);

  // Update steps when props change
  useEffect(() => {
    setAnimationState((prev) => ({
      ...prev,
      steps,
    }));
  }, [steps]);

  const startAnimation = useCallback(() => {
    // Debounce: if called multiple times within 50ms, treat as single call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      // Prevent multiple simultaneous animations
      if (isStartedRef.current) {
        return;
      }

      isStartedRef.current = true;

      setAnimationState((prev) => ({
        ...prev,
        currentStepIndex: 0,
        isAnimating: true,
      }));

      // Start animating through steps
      let currentIndex = 0;

      const animateStep = () => {
        if (currentIndex >= steps.length) {
          // Animation complete with smooth finish
          setAnimationState((prev) => ({
            ...prev,
            currentStepIndex: steps.length - 1,
            completedSteps: steps.length,
            progressPercent: 100,
            isAnimating: false,
          }));
          isStartedRef.current = false;
          onAnimationComplete?.();
          return;
        }

        // Update current step with smooth transition
        const step = steps[currentIndex];
        const completedCount = currentIndex + 1;
        // Smooth easing: start slow, accelerate, then decelerate
        const progressPercent = Math.round(
          (completedCount / (steps.length - 1)) * 100
        );

        // Stagger updates for smoothness: update step first, then progress
        setAnimationState((prev) => ({
          ...prev,
          currentStepIndex: currentIndex,
          completedSteps: completedCount,
        }));

        // Delay progress update slightly for smooth visual flow
        setTimeout(() => {
          setAnimationState((prev) => ({
            ...prev,
            progressPercent,
          }));
        }, 100);

        onStepComplete?.(currentIndex, step);

        currentIndex++;

        // Schedule next step with smooth timing
        // Use 1800ms to account for 200ms transition delay for smooth feel
        timeoutRef.current = setTimeout(animateStep, delayPerStep);
      };

      animateStep();
    }, debounceDelay);
  }, [steps, delayPerStep, debounceDelay, onStepComplete, onAnimationComplete]);

  const stopAnimation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    isStartedRef.current = false;

    setAnimationState((prev) => ({
      ...prev,
      isAnimating: false,
    }));
  }, []);

  const resetAnimation = useCallback(() => {
    stopAnimation();
    isStartedRef.current = false;

    setAnimationState({
      currentStepIndex: -1,
      completedSteps: 0,
      progressPercent: 0,
      isAnimating: false,
      steps,
    });
  }, [stopAnimation, steps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    ...animationState,
    startAnimation,
    stopAnimation,
    resetAnimation,
  };
};
