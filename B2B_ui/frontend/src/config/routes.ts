/**
 * Centralized Route Configuration
 * 
 * This file defines all routes and their authentication requirements.
 * Simpler approach - just define routes here, middleware handles everything.
 */

export interface RouteConfig {
  path: string
  requireAuth: boolean
  redirectTo?: string
  description?: string
}

/**
 * Route definitions
 * - requireAuth: true = Protected route (requires login)
 * - requireAuth: false = Public route (accessible to everyone)
 * - redirectTo: Where to redirect if access denied
 */
export const ROUTES: Record<string, RouteConfig> = {
  // Public routes (no auth required)
  HOME: {
    path: '/',
    requireAuth: false,
    description: 'Landing page',
  },

  // Auth-related routes (redirect to /feed if already logged in)
  LOGIN: {
    path: '/login',
    requireAuth: false,
    redirectTo: '/feed',
    description: 'Login page - redirects to feed if authenticated',
  },
  REGISTER: {
    path: '/register',
    requireAuth: false,
    redirectTo: '/feed',
    description: 'Registration page - redirects to feed if authenticated',
  },
  FORGOT_PASSWORD: {
    path: '/forgot-password',
    requireAuth: false,
    description: 'Password reset page - public access',
  },

  // Public policy pages
  PRIVACY: {
    path: '/privacy',
    requireAuth: false,
    description: 'Privacy policy - public access',
  },
  TERMS: {
    path: '/terms',
    requireAuth: false,
    description: 'Terms and conditions - public access',
  },
  FAQ: {
    path: '/faq',
    requireAuth: false,
    description: 'FAQ page - public access',
  },
  
  // Resume Evaluator (public route, but submission requires auth)
  RESUME_EVALUATOR: {
    path: '/resume-evaluator',
    requireAuth: false,
    description: 'Resume evaluator tool - public access, auth required for evaluation',
  },
  
  // Debug page (public access for testing)
  AUTH_DEBUG: {
    path: '/auth-debug',
    requireAuth: false,
    description: 'Auth debug page - public access',
  },

  // Special case: Role selection (requires auth but no role assigned yet)
  SELECT_ROLE: {
    path: '/select-role',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Role selection page - requires auth',
  },

  // Protected routes (require authentication)
  PROFILE: {
    path: '/profile',
    requireAuth: true,
    redirectTo: '/login',
    description: 'User profile page - requires authentication',
  },
  PROFILE_CREATE: {
    path: '/profile/create',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Create profile page - requires authentication',
  },
  PROFILE_CREATE_BUSINESS: {
    path: '/profile/create-business',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Create business profile page - requires authentication',
  },
  USER_PROFILE: {
    path: '/user',
    requireAuth: true,
    redirectTo: '/login',
    description: 'View other user profiles - requires authentication',
  },
  FEED: {
    path: '/feed',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Feed - requires authentication',
  },
  CONNECTIONS: {
    path: '/connections',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Connections page - requires authentication',
  },
  CHAT: {
    path: '/chat',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Chat page - requires authentication',
  },
  NOTIFICATIONS: {
    path: '/notifications',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Notifications page - requires authentication',
  },
  SETTINGS: {
    path: '/settings',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Settings page - requires authentication',
  },
  ACCOUNT_SETTINGS: {
    path: '/settings/account',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Account settings - requires authentication',
  },
  PROFILE_SETTINGS: {
    path: '/settings/profile',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Profile settings - requires authentication',
  },
  NOTIFICATION_SETTINGS: {
    path: '/settings/notifications',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Notification settings - requires authentication',
  },
  THEME_SETTINGS: {
    path: '/settings/theme',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Theme settings - requires authentication',
  },
  DEACTIVATION_SETTINGS: {
    path: '/settings/deactivation',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Account deactivation - requires authentication',
  },
    CHALLENGE: {
    path: '/challenge',
    requireAuth: false,
    description: 'Business challenge page - public access with optional login',
  },
  CODE_BREAKER_CHALLENGE: {
    path: '/Code-Breaker-Challenge',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Business challenge submission page - requires authentication',
  },
  CHALLENGE_RESULTS: {
    path: '/challenge-results',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Challenge submissions organizer view - restricted to specific organizers',
  },
  CONTESTS: {
    path: '/contests',
    requireAuth: true,
    redirectTo: '/login',
    description: 'Contest management page - restricted to specific organizers',
  },
  APPLICATIONS: {
    path: '/applications',
    requireAuth: true,
    redirectTo: '/login',
    description: 'My applications page - requires authentication',
  },

  // Job-related routes (public access)
  BUSINESS_JOBS: {
    path: '/businesses/[profileId]/jobs',
    requireAuth: false,
    description: 'All jobs for a business profile - public access',
  },
  JOB_DETAIL: {
    path: '/jobs/[jobId]',
    requireAuth: false,
    description: 'Individual job detail page - public access',
  },
  BUSINESS_JOB_DETAIL: {
    path: '/businesses/[profileId]/jobs/[jobId]',
    requireAuth: false,
    description: 'Job detail from business profile - public access',
  },
}

/**
 * Helper function to get route config by path
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  // Find exact or prefix match for the route
  return Object.values(ROUTES).find(route => {
    if (route.path === '/') {
      return path === '/'
    }
    return path === route.path || path.startsWith(route.path + '/')
  })
}

/**
 * Helper function to check if a route requires authentication
 * DEFAULT: All routes require auth unless explicitly marked as public
 */
export function isProtectedRoute(path: string): boolean {
  const route = getRouteConfig(path)
  // If route is not defined, protect it by default
  return route?.requireAuth ?? true
}

/**
 * Helper function to check if a route is public-only (should redirect if authenticated)
 */
export function isPublicOnlyRoute(path: string): boolean {
  const route = getRouteConfig(path)
  return route?.requireAuth === false && (path === '/login' || path === '/register')
}

/**
 * Get redirect URL for unauthorized access
 * DEFAULT: Protect all routes not explicitly defined as public
 */
export function getRedirectUrl(path: string, isAuthenticated: boolean): string | null {
  const route = getRouteConfig(path)
  
  console.log('[Routes] Checking access:', {
    path,
    isAuthenticated,
    routeFound: !!route,
    requireAuth: route?.requireAuth,
    routePath: route?.path
  })
  
  // If no route config found, protect by default (redirect to login if not authenticated)
  if (!route) {
    console.log('[Routes] No route config found - protecting by default')
    return !isAuthenticated ? '/login' : null
  }

  // If route requires auth and user is not authenticated
  if (route.requireAuth && !isAuthenticated) {
    console.log('[Routes] Route requires auth but user not authenticated - redirecting to login')
    return route.redirectTo || '/login'
  }

  // If route is public-only (login/register) and user IS authenticated
  if (!route.requireAuth && isAuthenticated && (path === '/login' || path === '/register')) {
    console.log('[Routes] Public-only route but user authenticated - redirecting to feed')
    return route.redirectTo || '/feed'
  }

  console.log('[Routes] Access allowed')
  return null
}
