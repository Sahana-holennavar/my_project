/**
 * Hook to check tutorial state
 * Used to prevent redirects or other actions during tutorial
 * New Flow: Step 0 = Role Selection, Steps 1-7 = Profile, Steps 8-9 = Feed
 */

import { useCallback } from 'react';
import { TUTORIAL_STORAGE_KEY, type TutorialState } from '@/config/tutorialConfig';

export const useTutorialState = () => {
  /**
   * Check if tutorial is currently active and on feed steps (8-9)
   */
  const isTutorialActiveOnFeed = useCallback((): boolean => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return false;
    
    try {
      const tutorialState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      
      if (!tutorialState) {
        return false; // Tutorial not started
      }

      const state: TutorialState = JSON.parse(tutorialState);
      
      // Tutorial is active on feed if:
      // 1. Status is 'in-progress'
      // 2. Current step is 8 or 9 (feed steps)
      const currentStep = state.lastStepIndex ?? 0;
      return (
        state.status === 'in-progress' && 
        (currentStep === 8 || currentStep === 9)
      );
    } catch (error) {
      console.error('[useTutorialState] Error checking tutorial state:', error);
      return false;
    }
  }, []);

  /**
   * Check if tutorial is completed
   */
  const isTutorialComplete = useCallback((): boolean => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return false;
    
    try {
      const tutorialState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      
      if (!tutorialState) {
        return false; // Tutorial not started
      }

      const state: TutorialState = JSON.parse(tutorialState);
      return state.status === 'completed';
    } catch (error) {
      console.error('[useTutorialState] Error checking tutorial completion:', error);
      return false;
    }
  }, []);

  /**
   * Check if tutorial is in progress (any step)
   */
  const isTutorialInProgress = useCallback((): boolean => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return false;
    
    try {
      const tutorialState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      
      if (!tutorialState) {
        return false; // Tutorial not started
      }

      const state: TutorialState = JSON.parse(tutorialState);
      return state.status === 'in-progress';
    } catch (error) {
      console.error('[useTutorialState] Error checking tutorial progress:', error);
      return false;
    }
  }, []);

  /**
   * Get current tutorial step
   */
  const getCurrentTutorialStep = useCallback((): number | null => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return null;
    
    try {
      const tutorialState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      
      if (!tutorialState) {
        return null;
      }

      const state: TutorialState = JSON.parse(tutorialState);
      return state.lastStepIndex ?? null;
    } catch (error) {
      console.error('[useTutorialState] Error getting tutorial step:', error);
      return null;
    }
  }, []);

  return {
    isTutorialActiveOnFeed,
    isTutorialComplete,
    isTutorialInProgress,
    getCurrentTutorialStep,
  };
};
