'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setAuthData, setLoading, clearAuth } from '@/store/slices/authSlice'
import { clearTriedBeforeLogin } from '@/store/slices/resumeEvaluatorSlice'
import { fetchProfile } from '@/store/slices/profileSlice'
import type { UserRole } from '@/types/auth'
import { tokenStorage } from '@/lib/tokens'
import { authApi } from '@/lib/api'
import { Loading } from '@/components/common/loading'

/**
 * AuthInitializer - Restores Redux auth state from cookies on app load
 * This ensures authentication persists across page refreshes by:
 * 1. Reading tokens from cookies
 * 2. Decoding the JWT to get user data
 * 3. Fetching role status from API
 * 4. Restoring the complete auth state in Redux
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const triedBeforeLogin = useAppSelector(state => state.resumeEvaluator.triedBeforeLogin)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthInitializer] Starting authentication initialization...')
      dispatch(setLoading(true))
      
      // Check if tokens exist in cookies
      const tokens = tokenStorage.getStoredTokens()
      
      if (tokens && !tokenStorage.isTokenExpired()) {
        console.log('[AuthInitializer] Valid tokens found, decoding user data...')
        
        try {
          // Decode JWT to get user information
          const jwtPayload = tokenStorage.getUserFromToken()
          console.log('[AuthInitializer] JWT Payload:', jwtPayload)
          
          if (!jwtPayload) {
            throw new Error('Failed to decode JWT token')
          }

          // Fetch role status to get complete user info
          let roleData: { role_name?: string; role_id?: number; user_id?: number } | null = null
          try {
            const response = await authApi.getRoleStatus()
            if (response.success && response.data) {
              roleData = response.data
              console.log('[AuthInitializer] Role data fetched:', roleData)
            }
          } catch (error) {
            console.warn('[AuthInitializer] Could not fetch role status:', error)
            // Continue without role data - user might not have assigned a role yet
          }

          // Build user object from JWT payload and role data
          const user = {
            id: String(jwtPayload.user_id || jwtPayload.sub || roleData?.user_id || ''),
            email: String(jwtPayload.email || jwtPayload.user_email || ''),
            name: String(jwtPayload.name || jwtPayload.user_name || ''),
            user_type: (jwtPayload.user_type || 'professional') as 'student' | 'professional',
            role: roleData?.role_name as UserRole | undefined,
            created_at: String(jwtPayload.created_at || new Date().toISOString()),
            updated_at: String(jwtPayload.updated_at || new Date().toISOString()),
          }

          console.log('[AuthInitializer] Restoring auth state with user:', user)

          // Restore auth state in Redux
          dispatch(setAuthData({
            user,
            tokens,
          }))

          console.log('[AuthInitializer] Auth state restored successfully')
          
          // Fetch user profile immediately after restoring auth
          if (user.id) {
            try {
              console.log('[AuthInitializer] Fetching user profile...')
              await dispatch(fetchProfile(user.id)).unwrap()
              console.log('[AuthInitializer] Profile fetched successfully')
            } catch (profileError) {
              console.error('[AuthInitializer] Failed to fetch profile:', profileError)
              // Don't block app initialization if profile fetch fails
            }
          }
          
          // Redirect to resume evaluator if user tried it before login
          if (triedBeforeLogin) {
            console.log('[AuthInitializer] User tried resume evaluator before login, redirecting...')
            dispatch(clearTriedBeforeLogin())
            // Use setTimeout to ensure state updates are processed
            setTimeout(() => {
              router.push('/resume-evaluator')
            }, 100)
          }
        } catch (error) {
          // If token is invalid, clear everything
          console.error('[AuthInitializer] Failed to restore auth state:', error)
          
          // Clear Redux state
          dispatch(clearAuth())
          
          // Clear cookies
          tokenStorage.clearTokens()
          
          // Clear localStorage items
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('techvruk_tutorial_state')
            localStorage.removeItem('techvruk_tutorial_completed')
          }
        }
      } else {
        console.log('[AuthInitializer] No valid tokens found or tokens expired - clearing all data')
        
        // Clear everything when no tokens or expired
        dispatch(clearAuth())
        tokenStorage.clearTokens()
        
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('techvruk_tutorial_state')
          localStorage.removeItem('techvruk_tutorial_completed')
        }
      }
      
      dispatch(setLoading(false))
      setIsInitializing(false)
      console.log('[AuthInitializer] Initialization complete')
    }

    initializeAuth()

    // Set up periodic token expiration check (every 60 seconds)
    // Only redirect if not already on login/register page
    const tokenCheckInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        // Don't check if already on auth pages
        if (currentPath === '/login' || currentPath === '/register' || currentPath.startsWith('/forgot-password')) {
          return
        }
        
        if (tokenStorage.isTokenExpired()) {
          console.log('[AuthInitializer] Token expired, clearing all auth data and redirecting...')
          
          // Clear Redux state
          dispatch(clearAuth())
          
          // Clear cookies
          tokenStorage.clearTokens()
          
          // Clear localStorage items
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('techvruk_tutorial_state')
            localStorage.removeItem('techvruk_tutorial_completed')
            localStorage.removeItem('theme')
            localStorage.removeItem('techvruk_search_history')
          }
          
          // Redirect to login page only if not already there
          if (currentPath !== '/login') {
            window.location.href = '/login'
          }
        }
      }
    }, 60000) // Check every 60 seconds (reduced frequency)

    // Cleanup interval on unmount
    return () => {
      clearInterval(tokenCheckInterval)
    }
  }, [dispatch, router, triedBeforeLogin])

  // Show global loading spinner while initializing auth
  if (isInitializing) {
    return <Loading size="lg" text="Initializing application..." />
  }

  return <>{children}</>
}
