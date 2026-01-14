import { Step } from 'react-joyride';

/**
 * Tutorial step configurations for TechVruk onboarding
 * Complete flow: Welcome → Profile Setup (Steps 0-6) → Feed (Step 7) → Navigation Tour (Steps 8-10)
 * Total: 11 steps
 */
export const tutorialSteps: Step[] = [
  // ========== WELCOME ==========
  {
    target: 'body',
    content: 'Welcome to TechVruk! Let\'s set up your profile and explore the platform. This quick tour will help you get started in just a few steps.',
    title: '👋 Welcome to TechVruk!',
    placement: 'center',
    disableBeacon: true,
    styles: {
      options: {
        zIndex: 10000,
      },
    },
  },

  // ========== PROFILE SETUP (Steps 2-7) ==========
  {
    target: '[data-tour="avatar-upload"]',
    content: 'This is your profile picture area. Hover over it and click the camera icon to upload your photo. This helps others recognize you!',
    title: '📸 Step 1: Add Your Avatar',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="banner-upload"]',
    content: 'This is your banner image area. Hover over it and click the camera icon to upload an image that represents you or your profession.',
    title: '🎨 Step 2: Add Banner Image',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="edit-profile"]',
    content: 'Click here to edit your personal information - add your name, bio, location, profession, and contact details. Complete your profile to make a great first impression!',
    title: '✏️ Step 3: Fill Basic Information',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-section"]',
    content: 'Use this button to add sections to your profile like Experience, Education, Skills, Projects, Certifications, and Awards. Build a comprehensive professional profile!',
    title: '➕ Step 4: Add Profile Sections',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="profile-completion"]',
    content: 'Track your profile completion progress here. Complete all sections to reach 100% and make your profile stand out to connections and employers!',
    title: '📊 Step 5: Complete Your Profile',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="about-section"]',
    content: 'This is your "About" section. Click the edit button to add a professional summary that describes who you are, what you do, and what you\'re passionate about. This is your elevator pitch!',
    title: '💼 Step 6: About Section',
    placement: 'bottom',
    disableBeacon: true,
  },

  // ========== FEED TOUR (Step 7) ==========
  {
    target: '[data-tour="create-post"]',
    content: 'Now let\'s explore the platform! This is where you create and share your posts. Share updates, ideas, articles, achievements, or anything relevant with your professional network!',
    title: '✍️ Step 7: Create Posts',
    placement: 'bottom',
    disableBeacon: true,
  },

  // ========== NAVIGATION TOUR (Steps 8-10) ==========
  {
    target: '[data-tour="connections"]',
    content: 'Click here to view and manage your connections. Build your professional network by connecting with colleagues, industry peers, and potential collaborators!',
    title: '� Step 8: Connections',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="notifications"]',
    content: 'Click here to view your notifications - stay updated on likes, comments, mentions, connection requests, and more!',
    title: '🔔 Step 9: Notifications',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="settings"]',
    content: 'Access your settings here to customize your profile, privacy, notifications, and account preferences. You\'re all set to explore TechVruk! 🚀',
    title: '⚙️ Step 10: Settings',
    placement: 'bottom',
    disableBeacon: true,
  },
];

/**
 * Tutorial styling configuration
 */
export const tutorialStyles = {
  options: {
    arrowColor: 'var(--primary, #3b82f6)',
    backgroundColor: 'var(--background, #ffffff)',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    primaryColor: 'var(--primary, #3b82f6)',
    textColor: 'var(--foreground, #000000)',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
    fontSize: '14px',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  tooltipContent: {
    lineHeight: '1.6',
  },
  buttonNext: {
    backgroundColor: 'var(--primary, #3b82f6)',
    borderRadius: '8px',
    fontSize: '14px',
    padding: '8px 16px',
    transition: 'all 0.3s ease',
  },
  buttonBack: {
    color: 'var(--muted-foreground, #6b7280)',
    fontSize: '14px',
    marginRight: '8px',
  },
  buttonSkip: {
    color: 'var(--muted-foreground, #6b7280)',
    fontSize: '14px',
  },
  beacon: {
    display: 'none',
  },
};

/**
 * Tutorial locale configuration for custom button labels
 */
export const tutorialLocale = {
  back: 'Back',
  close: 'Close',
  last: 'Finish',
  next: 'Next',
  open: 'Open',
  skip: 'Skip Tutorial',
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
