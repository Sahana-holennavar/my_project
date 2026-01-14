'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS, LIFECYCLE } from 'react-joyride';
import { toast } from 'sonner';
import { useAppSelector } from '@/store/hooks';
import {
  tutorialSteps,
  getTutorialSteps,
  tutorialStyles,
  tutorialLocale,
  TUTORIAL_STORAGE_KEY,
  TutorialStatus,
  TutorialState,
} from '@/config/tutorialConfig';
import { updateTutorialStatus, getTutorialStatus } from '@/lib/api/tutorialApi';

interface UserTutorialProps {
  /** Whether to run the tutorial */
  run?: boolean;
  /** Callback when tutorial is completed or skipped */
  onComplete?: (status: TutorialStatus) => void;
  /** Force restart tutorial even if completed */
  forceRestart?: boolean;
}

/**
 * UserTutorial Component
 * Provides an interactive guided tour for new users
 */
export const UserTutorial: React.FC<UserTutorialProps> = ({
  run = true,
  onComplete,
  forceRestart = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Get tutorial status from Redux (from login response)
  const user = useAppSelector((state) => state.auth.user);
  const tutorialStatusFromAPI = user?.tutorial_status;
  
  const [runTutorial, setRunTutorial] = useState(false);
  const [waitingForAction, setWaitingForAction] = useState(false); // Track if we're waiting for user action
  const [dynamicSteps, setDynamicSteps] = useState(() => getTutorialSteps()); // Initialize with screen-size-specific steps
  const [componentMounted, setComponentMounted] = useState(false);
  const [isResetting, setIsResetting] = useState(false); // Prevent reset loops
  const [isTransitioningToFeed, setIsTransitioningToFeed] = useState(false); // Prevent redirect during step 7→8 transition
  
  // Log component mount
  useEffect(() => {
    setComponentMounted(true);
  }, []); // Dynamic steps based on page state
  
  // Initialize stepIndex from localStorage if tutorial is in progress
  const getInitialStepIndex = useCallback((): number => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return 0;
    
    try {
      const tutorialState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!tutorialState) return 0;
      
      const state: TutorialState = JSON.parse(tutorialState);
      
      // If tutorial is in progress, continue from last step
      if (state.status === 'in-progress' && state.lastStepIndex !== undefined) {
        console.log('🔄 Resuming tutorial from step:', state.lastStepIndex);
        return state.lastStepIndex;
      }
      
      return 0; // Start from beginning for new users
    } catch (error) {
      console.error('Error getting initial step index:', error);
      return 0;
    }
  }, []);
  
  const [stepIndex, setStepIndex] = useState(getInitialStepIndex);
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * Save tutorial status to localStorage
   */
  const saveTutorialStatus = useCallback(
    (status: TutorialStatus, lastStep?: number, skipApiCall?: boolean) => {
      try {
        const state: TutorialState = {
          status,
          completedAt: status === 'completed' || status === 'skipped' ? new Date().toISOString() : undefined,
          lastStepIndex: lastStep,
        };

        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));

        // Call API to sync with backend (unless explicitly skipped)
        if (!skipApiCall) {
          syncTutorialStatusWithBackend(status, lastStep);
        }
      } catch (error) {
        console.error('Error saving tutorial status:', error);
      }
    },
    []
  );

  /**
   * Sync tutorial status with backend
   */
  const syncTutorialStatusWithBackend = async (status: TutorialStatus, lastStepIndex?: number) => {
    try {
      // Map frontend status to backend format
      let backendStatus: 'complete' | 'skipped' | 'incomplete';
      
      if (status === 'completed') {
        backendStatus = 'complete';
      } else if (status === 'skipped') {
        backendStatus = 'skipped';
      } else {
        // 'in-progress' or 'not-started' → 'incomplete'
        backendStatus = 'incomplete';
      }
      
      // Call API to sync tutorial status with backend
      await updateTutorialStatus(backendStatus);
      console.log('✅ Tutorial status synced with backend:', backendStatus);
    } catch (error) {
      console.error('❌ Error syncing tutorial status with backend:', error);
      // Don't throw error - continue with local storage even if API fails
    }
  };

  /**
   * Smart scroll to element only if it's not visible
   */
  const smartScrollToElement = useCallback((target: string) => {
    try {
      const element = document.querySelector(target);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      // Very lenient visibility check - only scroll if element is mostly cut off
      // Just need 30px buffer for tooltip space
      const isReasonablyVisible = (
        rect.top >= -50 && // Allow partial top cutoff
        rect.left >= -50 && // Allow partial left cutoff
        rect.bottom <= (windowHeight + 50) && // Allow partial bottom cutoff
        rect.right <= (windowWidth + 50) && // Allow partial right cutoff
        rect.top < (windowHeight - 100) // But bottom should be at least 100px from bottom
      );

      // Only scroll if element is NOT reasonably visible
      if (!isReasonablyVisible) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        
        // Force a reflow to ensure scroll completes before Joyride positions
        if (element instanceof HTMLElement) {
          void element.offsetHeight;
        }
      }
    } catch (error) {
      console.error('Error scrolling to element:', error);
    }
  }, []);

  /**
   * Handle tutorial callback events
   */
  const handleTutorialCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type, lifecycle } = data;

      console.log('📍 Tutorial Event:', { type, index, action, status, pathname, isNavigating });

      // Skip processing during navigation or scrolling
      if (isNavigating) {
        console.log('⏸️ Skipping - currently navigating');
        return;
      }

      // Pre-scroll to target BEFORE step is shown to ensure proper tooltip positioning
      if (type === EVENTS.STEP_BEFORE) {
        const currentStep = tutorialSteps[index];
        if (currentStep && typeof currentStep.target === 'string' && currentStep.target !== 'body') {
          smartScrollToElement(currentStep.target as string);
        }
      }

      // Handle page navigation based on step index
      // NEW FLOW:
      // Step 0: Role Selection page (/select-role)
      // Step 1: Profile Create page (/profile/create) - 3-step form
      // Steps 2-7: Profile page (/profile) - Avatar, Banner, Add Sections, Progress
      // Step 8: Feed page (/feed) - Create Post and Complete
      const currentStep = tutorialSteps[index];
      const currentTarget = typeof currentStep?.target === 'string' ? currentStep.target : '';

      // Determine which page the current step requires
      const requiresRoleSelectionPage = index === 0; // Step 0: Choose role
      const requiresProfileCreatePage = index === 1; // Step 1: Profile create form
      const requiresProfilePage = index >= 2 && index <= 7; // Steps 2-7: Profile setup
      const requiresFeedPage = index === 8; // Step 8: Feed and complete tutorial
      
      const isOnRoleSelectionPage = pathname?.includes('/select-role');
      const isOnProfileCreatePage = pathname?.includes('/profile/create');
      const isOnProfilePage = pathname?.includes('/profile') && !pathname?.includes('/profile/create');
      const isOnFeedPage = pathname?.includes('/feed');
      
      // Check if we're showing the "Create Profile" button (no profile exists)
      const createProfileButton = document.querySelector('[data-tour="create-profile-button"]');
      const hasCreateProfileButton = createProfileButton !== null;

      console.log('📊 Page Check:', { 
        index,
        stepNumber: index + 1,
        requiresRoleSelectionPage,
        requiresProfileCreatePage,
        requiresProfilePage,
        requiresFeedPage,
        isOnRoleSelectionPage,
        isOnProfileCreatePage,
        isOnProfilePage,
        isOnFeedPage,
        currentPath: pathname,
        type,
        action,
        lifecycle
      });

      // Check if we need to navigate to a different page ONLY on STEP_BEFORE with INIT lifecycle
      if (type === EVENTS.STEP_BEFORE && lifecycle === LIFECYCLE.INIT && !isNavigating) {
        console.log('🔍 Checking if navigation needed (INIT lifecycle)...', {
          requiresRoleSelectionPage,
          requiresProfileCreatePage,
          requiresProfilePage,
          requiresFeedPage,
          isOnRoleSelectionPage,
          isOnProfileCreatePage,
          isOnProfilePage,
          isOnFeedPage
        });
        
        // Need role selection page but currently NOT on it
        if (requiresRoleSelectionPage && !isOnRoleSelectionPage) {
          console.log('🔄 Need to navigate to role selection page for step', index + 1);
          setIsNavigating(true);
          setRunTutorial(false); // Pause tutorial
          
          // Save current step before navigation
          saveTutorialStatus('in-progress', index);
          
          // Navigate to role selection
          router.push('/select-role');
          
          // Resume tutorial after navigation
          setTimeout(() => {
            console.log('✅ Navigation to role selection complete, resuming tutorial at step', index + 1);
            setIsNavigating(false);
            setRunTutorial(true);
          }, 2500);
          
          return;
        }
        
        // Need profile create page but currently NOT on it
        if (requiresProfileCreatePage && !isOnProfileCreatePage) {
          console.log('🔄 Need to navigate to profile create page for step', index + 1);
          setIsNavigating(true);
          setRunTutorial(false); // Pause tutorial
          
          // Save current step before navigation
          saveTutorialStatus('in-progress', index);
          
          // Navigate to profile create
          router.push('/profile/create');
          
          // Resume tutorial after navigation
          setTimeout(() => {
            console.log('✅ Navigation to profile create complete, resuming tutorial at step', index + 1);
            setIsNavigating(false);
            setRunTutorial(true);
          }, 2500);
          
          return;
        }
        
        // Need profile page but currently NOT on profile page
        if (requiresProfilePage && !isOnProfilePage) {
          console.log('🔄 Need to navigate to profile page for step', index + 1);
          setIsNavigating(true);
          setRunTutorial(false); // Pause tutorial
          
          // Save current step before navigation
          saveTutorialStatus('in-progress', index);
          
          // Navigate to profile
          router.push('/profile');
          
          // Resume tutorial after navigation
          setTimeout(() => {
            console.log('✅ Navigation to profile complete, resuming tutorial at step', index + 1);
            setIsNavigating(false);
            setRunTutorial(true);
          }, 2500);
          
          return;
        }

        // Need feed page but currently NOT on feed page
        if (requiresFeedPage && !isOnFeedPage) {
          console.log('🔄 Need to navigate to feed page for step', index + 1);
          setIsNavigating(true);
          setRunTutorial(false); // Pause tutorial
          
          // Save current step before navigation
          saveTutorialStatus('in-progress', index);
          
          // Navigate to feed
          router.push('/feed');
          
          // Resume tutorial after navigation
          setTimeout(() => {
            console.log('✅ Navigation to feed complete, resuming tutorial at step', index + 1);
            setIsNavigating(false);
            setRunTutorial(true);
          }, 2500);
          
          return;
        }

        console.log('✓ Already on correct page, no navigation needed');
      }

      // Update step index ONLY on SKIP action or PREV, not on NEXT (we wait for action completion)
      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.SKIP) {
          console.log('⏭️ User clicked Skip for this step, advancing to next step immediately');
          const nextStep = index + 1;
          
          // Clear waiting state immediately
          setWaitingForAction(false);
          
          // Check if we need to navigate to a different page for the next step
          const requiresRoleSelectionPage = nextStep === 0;
          const requiresProfileCreatePage = nextStep === 1;
          const requiresProfilePage = nextStep >= 2 && nextStep <= 7;
          const requiresFeedPage = nextStep >= 8;
          
          const isOnRoleSelectionPage = pathname?.includes('/select-role');
          const isOnProfileCreatePage = pathname?.includes('/profile/create');
          const isOnProfilePage = pathname?.includes('/profile') && !pathname?.includes('/profile/create');
          const isOnFeedPage = pathname?.includes('/feed');
          
          // Navigate if needed for the next step
          if (requiresProfileCreatePage && !isOnProfileCreatePage) {
            console.log('🔄 Skipped step requires navigation to profile/create');
            setIsNavigating(true);
            router.push('/profile/create');
            // Update step index and restart tutorial after navigation
            setTimeout(() => {
              setStepIndex(nextStep);
              saveTutorialStatus('in-progress', nextStep);
              setIsNavigating(false);
              setRunTutorial(true);
            }, 2500);
          } else if (requiresProfilePage && !isOnProfilePage) {
            console.log('🔄 Skipped step requires navigation to profile');
            setIsNavigating(true);
            router.push('/profile');
            // Update step index and restart tutorial after navigation
            setTimeout(() => {
              setStepIndex(nextStep);
              saveTutorialStatus('in-progress', nextStep);
              setIsNavigating(false);
              setRunTutorial(true);
            }, 2500);
          } else if (requiresFeedPage && !isOnFeedPage) {
            console.log('🔄 Skipped step requires navigation to feed');
            setIsNavigating(true);
            router.push('/feed');
            // Update step index and restart tutorial after navigation
            setTimeout(() => {
              setStepIndex(nextStep);
              saveTutorialStatus('in-progress', nextStep);
              setIsNavigating(false);
              setRunTutorial(true);
            }, 2500);
          } else {
            // Already on correct page, immediately show next step
            console.log('✅ Skip: Already on correct page, showing next step immediately');
            // Update step index first
            setStepIndex(nextStep);
            saveTutorialStatus('in-progress', nextStep);
            // Temporarily pause and restart to force re-render
            setRunTutorial(false);
            setTimeout(() => {
              setRunTutorial(true);
            }, 100);
          }
        } else if (action === ACTIONS.PREV) {
          console.log('⬅️ User clicked Back, going to previous step');
          setStepIndex(index - 1);
          setWaitingForAction(false);
        } else if (action === ACTIONS.NEXT) {
          // For profile page steps (2-7), immediately advance to next step
          // For step 0 (role selection), wait for user to select a role
          // For step 1 (profile form), dismiss tooltip but keep tutorial running (don't close modal)
          // For step 8 (feed - create post), complete tutorial and call API
          const isProfileShowcaseStep = index >= 2 && index <= 7;
          const isRoleSelectionStep = index === 0;
          const isProfileCreationStep = index === 1;
          const isFeedStep = index === 8; // Step 8: Create post on feed - FINAL STEP
          
          if (isProfileShowcaseStep || isFeedStep) {
            // Profile showcase steps (2-7) AND step 8 (feed) - advance immediately
            console.log(`✅ User clicked "Got it!" on step ${index} - advancing immediately`);
            const nextStep = index + 1;
            
            // Clear waiting state
            setWaitingForAction(false);
            
            // Check if we need to navigate to feed for step 8
            if (nextStep === 8) {
              const isOnFeedPage = pathname?.includes('/feed');
              if (!isOnFeedPage) {
                console.log('🔄 Next step requires navigation to feed');
                // CRITICAL: Update stepIndex IMMEDIATELY before navigation to prevent redirect
                setStepIndex(nextStep); // Set to 8 NOW, not later!
                saveTutorialStatus('in-progress', nextStep);
                setIsNavigating(true);
                setIsTransitioningToFeed(true); // Set flag to prevent redirect
                setRunTutorial(false); // Pause tutorial during navigation
                router.push('/feed');
                // Restart tutorial after navigation completes
                setTimeout(() => {
                  setIsNavigating(false);
                  setRunTutorial(true);
                  // Clear transition flag after tutorial restarts
                  setTimeout(() => {
                    setIsTransitioningToFeed(false);
                  }, 500); // Clear flag after tutorial shows
                }, 2500);
                return;
              }
            }
            
            // If completing step 8 (feed step), directly complete tutorial without showing step 9
            if (index === 8) {
              console.log('🎉 Step 8 completed - directly completing tutorial and calling API');
              setRunTutorial(false);
              saveTutorialStatus('completed', 8);
              
              // Call API to sync completion status
              syncTutorialStatusWithBackend('completed', 8);
              
              toast.success('Tutorial completed! You\'re all set to explore TechVruk.', {
                duration: 4000,
              });
              onComplete?.('completed');
              return;
            }
            
            // Already on correct page, immediately show next step
            console.log('✅ Already on correct page, showing next step immediately');
            setStepIndex(nextStep);
            saveTutorialStatus('in-progress', nextStep);
            // Temporarily pause and restart to force re-render
            setRunTutorial(false);
            setTimeout(() => {
              setRunTutorial(true);
            }, 100);
          } else if (isProfileCreationStep) {
            // Step 1 - Profile creation form
            // User clicked "Got it!" - just set waiting state
            // Keep tutorial running so modal doesn't close!
            console.log('⏸️ User clicked "Got it!" on profile form - waiting for profile completion');
            setWaitingForAction(true);
            // Keep runTutorial as TRUE so the component stays mounted and modal doesn't close
            // The tooltip will be hidden by Joyride's internal state since we're not advancing steps
            // Tutorial will resume and advance to step 2 when profile is actually created
          } else {
            // For step 0 (role selection) - wait for action completion
            console.log('⏸️ User clicked "Got it!" on step 0 - waiting for role selection');
            setWaitingForAction(true);
            setRunTutorial(false); // Hide the tooltip so user can interact
            // Tutorial will resume and advance when role is selected
          }
        }
      }

      // Handle tutorial completion
      if (status === STATUS.FINISHED) {
        setRunTutorial(false);
        saveTutorialStatus('completed', index);
        toast.success('Tutorial completed! You\'re all set to explore TechVruk.', {
          duration: 4000,
        });
        onComplete?.('completed');
      }

      // Handle tutorial skip - ONLY when entire tutorial is skipped (not individual steps)
      // STATUS.SKIPPED is triggered when the SKIP button (skip entire tutorial) is clicked
      if (status === STATUS.SKIPPED) {
        console.log('🚫 Entire tutorial skip detected - calling API with complete status');
        setRunTutorial(false);
        
        // Save as 'skipped' in localStorage
        const state: TutorialState = {
          status: 'skipped',
          completedAt: new Date().toISOString(),
          lastStepIndex: index,
        };
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));
        
        // Send 'complete' to backend (treat skip same as completed)
        console.log('📤 Sending complete status to API...');
        (async () => {
          try {
            const result = await updateTutorialStatus('complete');
            console.log('✅ Tutorial skipped - API call successful:', result);
          } catch (error) {
            console.error('❌ Error sending skip status to backend:', error);
          }
        })();
        
        toast.info('Tutorial skipped. You can restart it anytime from settings.', {
          duration: 3000,
        });
        onComplete?.('skipped');
        return; // Exit early to prevent other handlers
      }

      // Save progress on each step
      if (type === EVENTS.STEP_AFTER) {
        saveTutorialStatus('in-progress', index);
      }
    },
    [saveTutorialStatus, onComplete, router, pathname, isNavigating, stepIndex, smartScrollToElement]
  );

  /**
   * Check if tutorial should be shown
   */
  const checkIfNewUser = (): boolean => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return false;
    
    // CRITICAL: First check backend status from API (most authoritative source)
    // If backend says tutorial is complete or skipped, don't show tutorial
    if (tutorialStatusFromAPI === 'complete' || tutorialStatusFromAPI === 'skipped') {
      console.log('✅ Tutorial already completed in backend:', tutorialStatusFromAPI);
      return false; // Not a new user - tutorial is done
    }
    
    // If force restart, treat as new user (override backend)
    if (forceRestart) {
      console.log('🔄 Force restart enabled - treating as new user');
      return true;
    }
    
    try {
      const tutorialState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      
      if (!tutorialState) {
        // No local state but backend says incomplete - new user
        return tutorialStatusFromAPI === 'incomplete';
      }

      const state: TutorialState = JSON.parse(tutorialState);
      
      // User is new if status is not completed or skipped
      return state.status !== 'completed' && state.status !== 'skipped';
    } catch (error) {
      console.error('Error checking tutorial status:', error);
      // On error, trust backend status
      return tutorialStatusFromAPI === 'incomplete';
    }
  };

  /**
   * Initialize tutorial on component mount
   */
  useEffect(() => {
    // Wait for DOM to be fully loaded
    const initTimer = setTimeout(() => {
      const isNewUser = checkIfNewUser();
      
      // Determine initial step based on current page
      const isOnRoleSelection = pathname?.includes('/select-role');
      const isOnProfileCreate = pathname?.includes('/profile/create');
      const isOnProfile = pathname?.includes('/profile') && !pathname?.includes('/profile/create');
      const isOnFeed = pathname?.includes('/feed');
      
      // Check if profile exists (has avatar, banner, or sections)
      const avatarUpload = document.querySelector('[data-tour="avatar-upload"]');
      const hasProfile = avatarUpload !== null;
      
      // Check if profile creation modal is open
      const profileModalForm = document.querySelector('[data-tour="profile-modal-form"]');
      const isModalOpen = profileModalForm !== null;
      
      let initialStep = stepIndex;
      
      // Set initial step based on current page if tutorial is starting fresh
      if (isNewUser && !localStorage.getItem(TUTORIAL_STORAGE_KEY)) {
        if (isOnRoleSelection) {
          initialStep = 0;
        } else if (isOnProfileCreate) {
          initialStep = 1;
        } else if (isOnProfile) {
          initialStep = 2;
        } else if (isOnFeed) {
          initialStep = 8;
        }
        
        if (initialStep !== stepIndex) {
          console.log(`🎯 Setting initial step to ${initialStep} based on page: ${pathname}`);
          setStepIndex(initialStep);
        }
      }
      
      console.log('🎯 Tutorial Initialization Check:', {
        run,
        isNewUser,
        stepIndex: initialStep,
        pathname,
        isOnRoleSelection,
        isOnProfileCreate,
        isOnProfile,
        isOnFeed,
        hasProfile,
        isModalOpen,
        tutorialState: localStorage.getItem(TUTORIAL_STORAGE_KEY),
        targetElement: document.querySelector('[data-tour="role-options"]')
      });
      
      // CRITICAL: Only run tutorial if:
      // 1. On role selection page (Step 0)
      // 2. On profile create page (Step 1)  
      // 3. Profile creation modal is open (Step 1)
      // 4. Profile exists (Steps 2-7)
      // 5. On feed page (Step 8)
      
      const shouldRunTutorial = run && (
        isOnRoleSelection || // Always show on role selection
        isOnProfileCreate || // Always show on profile create page
        isModalOpen || // Show if modal is open (profile creation)
        (isOnProfile && hasProfile) || // Show on profile page only if profile exists
        isOnFeed // Show on feed page
      );
      
      if (shouldRunTutorial) {
        console.log('🚀 Starting tutorial - condition met:', {
          isOnRoleSelection,
          isOnProfileCreate,
          isModalOpen,
          hasProfile: isOnProfile && hasProfile,
          isOnFeed
        });
        
        // Set appropriate step based on page and state
        if (isOnRoleSelection) {
          setStepIndex(0);
        } else if (isModalOpen && !hasProfile) {
          // Modal is open but no profile exists - step 1
          setStepIndex(1);
        }
        
        setRunTutorial(true);
        setWaitingForAction(false);
        
        // If tutorial is in progress, still run it
        try {
          const tutorialState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
          if (tutorialState) {
            const state: TutorialState = JSON.parse(tutorialState);
            if (state.status === 'in-progress') {
              console.log('🔄 Resuming in-progress tutorial');
              setRunTutorial(true);
            }
          }
        } catch (error) {
          console.error('Error checking tutorial state:', error);
        }
      } else {
        console.log('⏭️ Tutorial NOT running - conditions not met');
        setRunTutorial(false);
      }
    }, 1500); // Increased delay to 1.5 seconds to ensure page is fully rendered

    return () => clearTimeout(initTimer);
  }, [run, checkIfNewUser, stepIndex, pathname]);

  /**
   * Update tutorial steps dynamically based on page state
   */
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const checkAndUpdateSteps = () => {
      // Clear any pending checks
      if (debounceTimer) clearTimeout(debounceTimer);
      
      // Debounce to prevent rapid re-renders
      debounceTimer = setTimeout(() => {
        // Check if Create Profile button exists (user on /profile with no profile)
        const createProfileButton = document.querySelector('[data-tour="create-profile-button"]');
        const hasCreateProfileButton = createProfileButton !== null;
        const profileForm = document.querySelector('[data-tour="profile-form"]');
        const hasProfileForm = profileForm !== null;
        const profileModalForm = document.querySelector('[data-tour="profile-modal-form"]');
        const hasProfileModalForm = profileModalForm !== null;
        
        console.log('🔍 Step Check:', { 
          stepIndex, 
          hasProfileModalForm, 
          hasCreateProfileButton,
          hasProfileForm,
          pathname,
          isResetting,
          runTutorial
        });
        
        // CRITICAL: If modal is open (user creating profile), we should be at step 1!
        // If we're on steps 2-7 but modal is open, reset to step 1
        if (hasProfileModalForm && stepIndex >= 2 && !isResetting) {
          console.log('⚠️ Modal is open (profile not created yet) but we\'re on step', stepIndex, '- RESETTING to step 1!');
          setIsResetting(true);
          setStepIndex(1);
          saveTutorialStatus('in-progress', 1);
          setTimeout(() => setIsResetting(false), 2000); // Prevent loop for 2 seconds
          return;
        }
        
        // If we're on profile page but no profile elements exist (avatar, etc.), go to step 1
        const avatarUpload = document.querySelector('[data-tour="avatar-upload"]');
        const isOnProfilePage = pathname?.includes('/profile') && !pathname?.includes('/profile/create');
        if (isOnProfilePage && !avatarUpload && stepIndex >= 2 && stepIndex <= 7 && !isResetting) {
          console.log('⚠️ On profile page but no profile elements found - user needs to create profile - going to step 1!');
          setIsResetting(true);
          setStepIndex(1);
          saveTutorialStatus('in-progress', 1);
          setTimeout(() => setIsResetting(false), 2000); // Prevent loop for 2 seconds
          return;
        }
        
        // If modal form is open at Step 1, target the modal title
        if (hasProfileModalForm && stepIndex === 1 && !isResetting) {
          const modifiedSteps = [...tutorialSteps];
          modifiedSteps[1] = {
            target: '[data-tour="profile-modal-title"]',
            content: '📝 Fill in this 3-step form with your details. Complete all required fields (*) and submit.',
            title: 'Complete Your Profile',
            placement: 'bottom',
            disableBeacon: false,
            spotlightClicks: true,
            offset: 15,
            floaterProps: {
              disableFlip: true,
            },
            styles: {
              options: {
                zIndex: 999999, // SUPER HIGH for modal
              },
              tooltip: {
                maxWidth: '90vw',
                padding: '16px', // Reduced padding
              },
              tooltipContent: {
                padding: '8px 0', // Minimal vertical padding
              },
              tooltipTitle: {
                marginBottom: '8px', // Less space below title
              },
            },
          };
          setDynamicSteps(modifiedSteps);
          
          // If tutorial is not running but should be (modal just opened), restart it with delay
          if (!runTutorial && waitingForAction) {
            console.log('📋 Modal opened, showing tutorial on modal form');
            setTimeout(() => {
              setRunTutorial(true);
            }, 500);
          }
        }
        // If on /profile page with Create Profile button, show button tooltip
        else if (hasCreateProfileButton && stepIndex === 1) {
          const modifiedSteps = [...tutorialSteps];
          modifiedSteps[1] = {
            target: '[data-tour="create-profile-button"]',
            content: '📝 Perfect! Click this button to open the profile creation form. Fill in all required fields and save to continue.',
            title: 'Create Your Profile',
            placement: 'top',
            disableBeacon: false,
            spotlightClicks: true,
          };
          setDynamicSteps(modifiedSteps);
        } else {
          // Use screen-size-appropriate steps
          setDynamicSteps(getTutorialSteps());
        }
      }, 300); // 300ms debounce delay
    };
    
    // Check immediately
    checkAndUpdateSteps();
    
    // Set up mutation observer to detect when modal opens - but throttle it
    const observer = new MutationObserver(() => {
      checkAndUpdateSteps();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [stepIndex, pathname, runTutorial, waitingForAction, isResetting, saveTutorialStatus]);

  /**
   * Auto-advance tutorial when user navigates after completing actions
   */
  useEffect(() => {
    const isOnProfilePage = pathname?.includes('/profile') && !pathname?.includes('/profile/create');
    const isOnProfileCreatePage = pathname?.includes('/profile/create');
    const isOnFeedPage = pathname?.includes('/feed');
    const isOnStep0 = stepIndex === 0;
    const isOnStep1 = stepIndex === 1;
    
    // If on step 0 (role selection) and user navigated to profile/create, advance to step 1
    if (isOnProfileCreatePage && isOnStep0 && !isNavigating) {
      console.log('🔄 User navigated to profile/create after role selection, advancing to step 1');
      setTimeout(() => {
        setStepIndex(1);
        saveTutorialStatus('in-progress', 1);
        setRunTutorial(true); // Ensure tutorial is running
        setWaitingForAction(false);
        console.log('✅ Advanced to step 1 on profile/create page');
      }, 800);
    }
    
    // If on step 1 (profile create form) and user navigated to profile page, advance to step 2
    // BUT ONLY if modal is NOT open (profile was actually created)
    if (isOnProfilePage && isOnStep1 && !isNavigating && !isResetting) {
      // Check if profile creation modal is open
      const profileModalForm = document.querySelector('[data-tour="profile-modal-form"]');
      const isModalOpen = profileModalForm !== null;
      
      // Check if profile exists (avatar element present)
      const avatarUpload = document.querySelector('[data-tour="avatar-upload"]');
      const hasProfile = avatarUpload !== null;
      
      // Only advance if modal is closed AND profile exists
      if (!isModalOpen && hasProfile) {
        console.log('🔄 User navigated to profile after creating profile, advancing to step 2');
        setTimeout(() => {
          setStepIndex(2);
          saveTutorialStatus('in-progress', 2);
          setRunTutorial(true); // Ensure tutorial is running
          setWaitingForAction(false);
          console.log('✅ Advanced to step 2 on profile page');
        }, 800);
      } else {
        console.log('⏸️ On profile page at step 1, but modal is open or profile not created yet - staying at step 1');
      }
    }
    
    // If on feed page and tutorial is on profile steps (1-6), REDIRECT BACK to profile
    // User should complete profile creation and showcase steps before going to feed
    // Note: Step 7 is the last profile step, and transition to step 8 is handled by ACTIONS.NEXT
    // CRITICAL: Don't redirect if:
    // 1. We're in the middle of transitioning from step 7 to step 8 (isTransitioningToFeed)
    // 2. We're currently navigating (isNavigating)
    // 3. Tutorial is on step 7 or beyond (step 7 is completing profile, steps 8+ are feed)
    if (isOnFeedPage && stepIndex >= 1 && stepIndex <= 6 && !isNavigating && !isTransitioningToFeed) {
      console.log('⚠️ User tried to go to feed but profile steps (1-6) not complete - redirecting to /profile');
      setIsNavigating(true);
      router.push('/profile');
      setTimeout(() => {
        setIsNavigating(false);
      }, 1000);
    }
    
    // NEW: Check Redux tutorial status on feed page
    // If user is on feed page and tutorial is incomplete (from API), redirect to profile
    // UNLESS they're already on step 8 (final feed step) OR tutorial is complete/skipped
    const isTutorialDone = tutorialStatusFromAPI === 'complete' || tutorialStatusFromAPI === 'skipped';
    if (isOnFeedPage && tutorialStatusFromAPI === 'incomplete' && stepIndex < 8 && !isNavigating && !isTransitioningToFeed && !isTutorialDone) {
      console.log('⚠️ Tutorial incomplete from API, and not on feed step yet - redirecting to /profile');
      setIsNavigating(true);
      router.push('/profile');
      setTimeout(() => {
        setIsNavigating(false);
      }, 1000);
    }
  }, [pathname, stepIndex, isNavigating, saveTutorialStatus, router, isResetting, isTransitioningToFeed, tutorialStatusFromAPI]);

  /**
   * Listen for action completion events to auto-advance tutorial
   */
  useEffect(() => {
    if (!waitingForAction) return;

    const handleActionCompleted = (event: CustomEvent) => {
      const { step, action } = event.detail;
      console.log('✅ Action completed:', { step, action, currentStep: stepIndex });
      
      // Verify this is for the current step
      if (step === stepIndex) {
        console.log(`🎉 Step ${stepIndex} action completed, advancing to step ${stepIndex + 1}`);
        setStepIndex(stepIndex + 1);
        saveTutorialStatus('in-progress', stepIndex + 1);
        setWaitingForAction(false);
        setRunTutorial(true); // Show tutorial again for next step
      }
    };

    // Listen for custom events from various components
    window.addEventListener('tutorial-action-completed', handleActionCompleted as EventListener);

    return () => {
      window.removeEventListener('tutorial-action-completed', handleActionCompleted as EventListener);
    };
  }, [waitingForAction, runTutorial, stepIndex, saveTutorialStatus]);

  /**
   * Monitor pathname changes during tutorial - DISABLED
   * Navigation is already handled in handleTutorialCallback to prevent redirect loops
   */
  // useEffect(() => {
  //   if (runTutorial && !isNavigating) {
  //     // Check if we're on the wrong page for current step
  //     const requiresFeedPage = stepIndex >= 7;
  //     const isOnFeedPage = pathname?.includes('/feed');
  //     const isOnProfilePage = pathname?.includes('/profile');

  //     console.log('👀 Pathname changed:', { 
  //       pathname, 
  //       stepIndex, 
  //       requiresFeedPage, 
  //       isOnFeedPage, 
  //       isOnProfilePage 
  //     });

  //     // If on wrong page, navigate back
  //     if (requiresFeedPage && !isOnFeedPage && isOnProfilePage) {
  //       console.warn('⚠️ Wrong page detected! Should be on feed but on profile. Redirecting...');
  //       router.push('/feed');
  //     } else if (!requiresFeedPage && !isOnProfilePage && isOnFeedPage) {
  //       console.warn('⚠️ Wrong page detected! Should be on profile but on feed. Redirecting...');
  //       router.push('/profile');
  //     }
  //   }
  // }, [pathname, runTutorial, stepIndex, isNavigating, router]);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && runTutorial) {
        setRunTutorial(false);
        saveTutorialStatus('skipped', stepIndex);
        toast.info('Tutorial closed. You can restart it anytime from settings.');
        onComplete?.('skipped');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runTutorial, stepIndex, saveTutorialStatus, onComplete]);

  /**
   * Sync scroll between page and overlay during tutorial
   */
  useEffect(() => {
    if (runTutorial && !isNavigating) {
      // Add classes for smooth scrolling
      document.documentElement.classList.add('tutorial-active');
      document.body.classList.add('tutorial-active');

      // Set overlay height to match full page height
      const updateOverlayHeight = () => {
        const overlay = document.querySelector('.react-joyride__overlay') as HTMLElement;
        if (overlay) {
          const pageHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );
          overlay.style.setProperty('height', `${pageHeight}px`, 'important');
          overlay.style.setProperty('min-height', `${pageHeight}px`, 'important');
        }
      };

      // Initial delay to ensure DOM is ready
      setTimeout(() => {
        updateOverlayHeight();
      }, 100);

      // Update overlay height on mount, resize, and mutations
      const resizeObserver = new ResizeObserver(() => {
        updateOverlayHeight();
      });
      
      resizeObserver.observe(document.body);
      window.addEventListener('resize', updateOverlayHeight);

      // Sync overlay scroll with page scroll
      const syncScroll = () => {
        const overlay = document.querySelector('.react-joyride__overlay');
        const spotlight = document.querySelector('.react-joyride__spotlight');
        
        if (overlay || spotlight) {
          // Force overlay and spotlight to update their position on scroll
          requestAnimationFrame(() => {
            // Trigger a repaint/reflow to update spotlight position
            if (spotlight instanceof HTMLElement) {
              void spotlight.offsetHeight;
            }
            // Update overlay height in case page content changed
            updateOverlayHeight();
          });
        }
      };

      // Listen to scroll events and sync
      window.addEventListener('scroll', syncScroll, { passive: true });
      document.addEventListener('scroll', syncScroll, { passive: true, capture: true });

      // Cleanup function
      return () => {
        document.documentElement.classList.remove('tutorial-active');
        document.body.classList.remove('tutorial-active');
        window.removeEventListener('scroll', syncScroll);
        window.removeEventListener('resize', updateOverlayHeight);
        resizeObserver.disconnect();
        document.removeEventListener('scroll', syncScroll, true);
      };
    }
  }, [runTutorial, isNavigating]);

  // Force center tooltips on mobile - override Popper inline styles
  useEffect(() => {
    if (!runTutorial) return;
    
    const checkAndCenterTooltip = () => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) return; // Exit if not mobile
      
      const floater = document.querySelector('[data-popper-placement]') as HTMLElement;
      if (floater) {
        // Only override horizontal positioning on mobile, keep vertical as-is
        const currentTop = floater.style.top;
        floater.style.position = 'fixed';
        floater.style.left = '50%';
        floater.style.transform = 'translateX(-50%)';
        floater.style.right = 'auto';
        // Preserve the top position that Popper calculated
        if (currentTop) {
          floater.style.top = currentTop;
        }
      }
    };
    
    // Only run on mobile
    if (window.innerWidth <= 768) {
      // Run immediately and after delays to catch async renders
      checkAndCenterTooltip();
      const timer = setTimeout(checkAndCenterTooltip, 100);
      const timer2 = setTimeout(checkAndCenterTooltip, 300);
      
      // Watch for DOM changes only on mobile
      const observer = new MutationObserver(checkAndCenterTooltip);
      observer.observe(document.body, { childList: true, subtree: true });
      
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
        observer.disconnect();
      };
    }
  }, [runTutorial, stepIndex]);

  // Early return if tutorial should not be shown
  if (!run || !checkIfNewUser()) {
    return null;
  }

  return (
    <>
      <Joyride
        key={`tutorial-${stepIndex}-${runTutorial}`}
        steps={dynamicSteps}
        run={runTutorial}
        stepIndex={stepIndex}
        continuous
        showProgress={false}
        showSkipButton
        callback={handleTutorialCallback}
        styles={tutorialStyles}
        locale={tutorialLocale}
        disableOverlay={false}
        disableOverlayClose={false}
        disableCloseOnEsc={false}
        spotlightClicks={true}
        spotlightPadding={10}
        scrollToFirstStep={true}
        disableScrolling={false}
        disableScrollParentFix={false}
        scrollOffset={80}
        scrollDuration={300}
        floaterProps={{
          disableAnimation: false,
          hideArrow: false,
          offset: 15,
          styles: {
            arrow: {
              length: 10,
              spread: 14,
            },
            floater: {
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))',
              zIndex: 999999, // SUPER HIGH Z-INDEX
            },
          },
        }}
        debug={false}
      />
    </>
  );
};

/**
 * Hook to restart tutorial programmatically
 */
export const useRestartTutorial = () => {
  const router = useRouter();
  
  const restartTutorial = useCallback(async () => {
    try {
      // Show loading toast
      toast.loading('Restarting tutorial...');
      
      // 1. Update tutorial status to incomplete via API (restart)
      await updateTutorialStatus('incomplete');
      
      // 2. Clear local storage
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      
      // 3. Show success message
      toast.dismiss();
      toast.success('Tutorial restarted! Redirecting to profile...');
      
      // 4. Redirect to profile page after short delay
      setTimeout(() => {
        router.push('/profile');
        // Force page reload to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }, 1000);
    } catch (error) {
      console.error('Error restarting tutorial:', error);
      toast.dismiss();
      toast.error('Failed to restart tutorial. Please try again.');
    }
  }, [router]);

  return { restartTutorial };
};

/**
 * Hook to check tutorial completion status
 * Reads from localStorage (synced via API calls in saveTutorialStatus)
 */
export const useTutorialStatus = () => {
  const [tutorialStatus, setTutorialStatus] = useState<TutorialState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Read from localStorage
      const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (stored) {
        setTutorialStatus(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading tutorial status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { ...tutorialStatus, isLoading };
};

export default UserTutorial;
