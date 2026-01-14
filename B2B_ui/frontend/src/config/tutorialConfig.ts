import { Step } from 'react-joyride';

/**
 * Tutorial step configurations for TechVruk onboarding
 * NEW FLOW:
 * Step 0: Role Selection page - Welcome below title, show role options
 * Step 1: Profile Create page (/profile/create) - Complete 3-step form (Personal Info, About, Education/Skills) - WAIT for completion
 * Step 2: Profile page - Avatar upload showcase (just show, no wait)
 * Step 3: Profile page - Banner upload showcase (just show, no wait)
 * Step 4: Profile page - Add Skills section showcase (just show, no wait)
 * Step 5: Profile page - Add Education section showcase (just show, no wait)
 * Step 6: Profile page - Add Experience section showcase (just show, no wait)
 * Step 7: Profile page - Profile completion progress showcase (just show, no wait)
 * Step 8: Feed page - Create first post - Tutorial completes after this step
 */
export const tutorialSteps: Step[] = [
  // ========== STEP 0: ROLE SELECTION PAGE (/select-role) ==========
  {
    target: '[data-tour="role-welcome-top"]',
    content: '🎉 Welcome to TechVruk! First, let\'s choose your role. Click on either Student or Professional card to select it, then click "Continue" to proceed.',
    title: 'Welcome! Choose Your Role',
    placement: 'bottom',
    disableBeacon: true,
    spotlightClicks: true,
    disableOverlayClose: true,
    hideBackButton: true,
    offset: 10,
    floaterProps: {
      disableFlip: true,
    },
    styles: {
      options: {
        zIndex: 999999,
      },
      tooltip: {
        minWidth: 300,
        maxWidth: 600,
        width: 'clamp(300px, 50vw, 600px)',
        maxHeight: 'calc(100vh - 150px)',
        overflow: 'auto',
      },
      spotlight: {
        display: 'none', // Hide spotlight since anchor is invisible
      },
      tooltipContainer: {
        textAlign: 'center',
      },
      tooltipTitle: {
        textAlign: 'center',
      },
      tooltipContent: {
        textAlign: 'left',
        padding: '10px 0',
      },
    },
  },

  // ========== STEP 1: PROFILE CREATE FORM (/profile/create) ==========
  {
    target: '[data-tour="profile-form-title"]',
    content: '📝 Fill in this form with your details. Complete all required fields (*) and click "Create Profile" to continue.',
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
        zIndex: 999999,
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
  },

  // ========== STEP 2: AVATAR UPLOAD (/profile) ==========
  {
    target: '[data-tour="avatar-upload"]',
    content: '📸 Add your profile picture! Hover and click the camera icon to upload.',
    title: 'Profile Picture',
    placement: 'bottom',
    disableBeacon: false,
    offset: 10,
    floaterProps: {
      disableFlip: false,
    },
    styles: {
      spotlight: {
        borderRadius: '50%',
      },
      tooltip: {
        maxWidth: '85vw',
        padding: '16px',
      },
      tooltipContent: {
        padding: '8px 0',
      },
    },
  },

  // ========== STEP 3: BANNER UPLOAD ==========
  {
    target: '[data-tour="banner-upload"]',
    content: '🎨 Customize with a banner image! Hover and click the camera icon to upload.',
    title: 'Banner Image',
    placement: 'bottom',
    disableBeacon: false,
    offset: 10,
    floaterProps: {
      disableFlip: false,
    },
    styles: {
      tooltip: {
        maxWidth: '85vw',
        padding: '16px',
      },
      tooltipContent: {
        padding: '8px 0',
      },
    },
  },
  
  // ========== STEP 4: ADD SKILLS ==========
  {
    target: '[data-tour="add-section-desktop"]', // Default to desktop, will be overridden for mobile
    content: '🎯 Use this button to add Skills, Education, Experience, and more sections!',
    title: 'Add Profile Sections',
    placement: 'bottom',
    disableBeacon: false,
    offset: 10,
    disableOverlayClose: true,
    hideBackButton: false,
    floaterProps: {
      disableFlip: false,
      styles: {
        floater: {
          filter: 'none',
        },
      },
    },
    styles: {
      tooltip: {
        maxWidth: '85vw',
        padding: '16px',
      },
      tooltipContent: {
        padding: '8px 0',
      },
    },
  },
  
  // ========== STEP 5: ADD EDUCATION ==========
  {
    target: '[data-tour="add-section-desktop"]', // Default to desktop, will be overridden for mobile
    content: '🎓 You can add your Education section to highlight your academic achievements.',
    title: 'Education Section',
    placement: 'bottom',
    disableBeacon: false,
    offset: 10,
    disableOverlayClose: true,
    hideBackButton: false,
    floaterProps: {
      disableFlip: false,
    },
    styles: {
      tooltip: {
        maxWidth: '85vw',
        padding: '16px',
      },
      tooltipContent: {
        padding: '8px 0',
      },
    },
  },
  
  // ========== STEP 6: ADD EXPERIENCE ==========
  {
    target: '[data-tour="add-section-desktop"]', // Default to desktop, will be overridden for mobile
    content: '💼 Add your Experience section to showcase your professional journey!',
    title: 'Experience Section',
    placement: 'bottom',
    disableBeacon: false,
    offset: 10,
    disableOverlayClose: true,
    hideBackButton: false,
    floaterProps: {
      disableFlip: false,
    },
    styles: {
      tooltip: {
        maxWidth: '85vw',
        padding: '16px',
      },
      tooltipContent: {
        padding: '8px 0',
      },
    },
  },
  
  // ========== STEP 7: PROFILE COMPLETION PROGRESS ==========
  {
    target: '[data-tour="profile-completion"]',
    content: '📊 Track your profile completion progress here! Complete all sections to stand out.',
    title: 'Profile Completion',
    placement: 'bottom',
    disableBeacon: false,
    offset: 10,
    floaterProps: {
      disableFlip: false,
    },
    styles: {
      tooltip: {
        maxWidth: '85vw',
        padding: '16px',
      },
      tooltipContent: {
        padding: '8px 0',
      },
    },
  },

  // ========== STEP 8: FEED - CREATE POST ==========
  {
    target: '[data-tour="create-post-input"]',
    content: '✍️ Welcome to your Feed! This is where you can create posts to share your thoughts, updates, and ideas with the community. Click here to start writing your first post!',
    title: 'Create Your First Post',
    placement: 'bottom',
    disableBeacon: false,
    spotlightClicks: true,
    offset: 10,
  },
  // Step 9 removed - tutorial completes directly after step 8
];

/**
 * Get tutorial steps based on screen size
 * Filters steps to show desktop or mobile specific buttons
 */
export const getTutorialSteps = (): Step[] => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  
  if (isMobile) {
    // Mobile: Replace steps 4, 5, 6 with mobile-specific targets
    return tutorialSteps.map((step, index) => {
      if (index === 4 || index === 5 || index === 6) {
        return {
          ...step,
          target: '[data-tour="add-section-mobile"]',
        };
      }
      return step;
    });
  } else {
    // Desktop: Keep original desktop targets
    return tutorialSteps;
  }
};

/**
 * Tutorial styling configuration
 */
export const tutorialStyles = {
  options: {
    arrowColor: 'var(--primary, #3b82f6)',
    backgroundColor: 'var(--background, #ffffff)',
    overlayColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent dark overlay
    primaryColor: 'var(--primary, #3b82f6)',
    textColor: 'var(--foreground, #000000)',
    zIndex: 999999, // SUPER HIGH Z-INDEX
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
    fontSize: '14px',
    minWidth: '280px', // Minimum 280px width for desktop
    maxWidth: '550px', // Maximum 550px width
    width: 'clamp(280px, 45vw, 550px)', // Responsive: min 280px, prefer 45% viewport, max 550px
    zIndex: 999999, // SUPER HIGH Z-INDEX
  },
  tooltipContainer: {
    textAlign: 'left' as const,
    zIndex: 999999, // SUPER HIGH Z-INDEX
  },
  tooltipTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  tooltipContent: {
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  buttonNext: {
    backgroundColor: 'var(--primary, #3b82f6)',
    borderRadius: '8px',
    fontSize: '14px',
    padding: '10px 20px',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
    fontWeight: '500',
  },
  buttonBack: {
    color: 'var(--muted-foreground, #6b7280)',
    fontSize: '14px',
    marginRight: '12px',
    padding: '10px 16px',
  },
  buttonSkip: {
    color: 'var(--muted-foreground, #6b7280)',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    padding: '10px 16px',
  },
  beacon: {
    display: 'block',
  },
  spotlight: {
    backgroundColor: 'transparent',
    borderRadius: '8px',
  },
};

/**
 * Tutorial locale configuration for custom button labels
 */
export const tutorialLocale = {
  back: 'Back',
  close: 'Close',
  last: 'Finish',
  next: 'Got it!',
  open: 'Open',
  skip: 'Skip',
};

/**
 * Tutorial storage key for localStorage
 */
export const TUTORIAL_STORAGE_KEY = 'techvruk_tutorial_completed';

/**
 * Tutorial status types
 */
export type TutorialStatus = 'completed' | 'skipped' | 'in-progress' | 'not-started';

/**
 * Tutorial state interface
 */
export interface TutorialState {
  status: TutorialStatus;
  completedAt?: string;
  lastStepIndex?: number;
}
