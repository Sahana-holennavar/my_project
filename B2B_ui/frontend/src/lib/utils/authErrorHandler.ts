import { tokenStorage } from '@/lib/tokens'
import type { AppDispatch } from '@/store'
import { clearAuth } from '@/store/slices/authSlice'

/**
 * Handle authentication errors (401) by clearing tokens and redirecting to login
 * @param error - The error object
 * @param dispatch - Redux dispatch function
 * @param router - Next.js router
 */
export function handleAuthError(
  error: unknown,
  dispatch?: AppDispatch,
  router?: { push: (path: string) => void }
): boolean {
  // Check if error is a 401 UNAUTHORIZED
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: number }).code === 401
  ) {
    // Clear tokens from cookies
    tokenStorage.clearTokens()
    
    // Clear auth state if dispatch is provided
    if (dispatch) {
      dispatch(clearAuth())
    }
    
    // Redirect to login if router is provided
    if (router) {
      router.push('/login')
    }
    
    return true
  }
  
  return false
}

/**
 * Check if token is expired and handle it
 * @param dispatch - Redux dispatch function
 * @param router - Next.js router
 * @returns true if token was expired and handled
 */
export function checkTokenExpiration(
  dispatch?: AppDispatch,
  router?: { push: (path: string) => void }
): boolean {
  if (tokenStorage.isTokenExpired()) {
    // Clear tokens from cookies
    tokenStorage.clearTokens()
    
    // Clear auth state if dispatch is provided
    if (dispatch) {
      dispatch(clearAuth())
    }
    
    // Redirect to login if router is provided
    if (router) {
      router.push('/login')
    }
    
    return true
  }
  
  return false
}
