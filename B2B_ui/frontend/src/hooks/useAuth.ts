'use client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { tokenStorage } from '@/lib/tokens'
import { validateRegisterData, validateLoginData } from '@/lib/validations/auth'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  loginUser as loginUserThunk,
  registerUser as registerUserThunk,
  checkRoleStatus as checkRoleStatusThunk,
  clearAuth 
} from '@/store/slices/authSlice'
import { fetchProfile } from '@/store/slices/profileSlice'
import { clearNotificationSummaryData } from '@/components/common/NotificationSummaryBar'
import type { RegisterData, LoginData, User } from '@/types/auth'

interface UseAuthReturn {
  registerUser: (userData: RegisterData) => Promise<void>
  loginUser: (credentials: LoginData) => Promise<void>
  logout: () => void
  isAuthenticated: () => boolean
  isLoading: boolean
  user: User | null
  error: string | null
}

export function useAuth(): UseAuthReturn {
  const dispatch = useAppDispatch()
  const router = useRouter()
  
  const { user, isAuthenticated: authState, isLoading, error } = useAppSelector((state) => state.auth)

  const registerUser = async (userData: RegisterData) => {
    try {
      const validation = validateRegisterData(userData, userData.user_type)
      if (!validation.success) {
        const errorMessages = validation.error.issues.map(issue => issue.message)
        toast.error(errorMessages.join(', '))
        return
      }

      await dispatch(registerUserThunk(userData)).unwrap()
      
      toast.success('Account created successfully!')
      // Auto-login the user after successful registration and redirect
      try {
        await loginUser({
          email: userData.email,
          password: (userData as any).password,
          remember_me: false,
        })
      } catch (err) {
        // If auto-login fails, fallback to login page
        router.push('/login')
      }
    } catch (error) {
      const errorMessage = error as string
      toast.error(errorMessage)
    }
  }

  const loginUser = async (credentials: LoginData) => {
    try {
      // Validate form fields client-side
      const validation = validateLoginData(credentials)
      if (!validation.success) {
        const errorMessages = validation.error.issues.map(issue => issue.message)
        toast.error(errorMessages.join(', '))
        return
      }

      const loginResult = await dispatch(loginUserThunk(credentials)).unwrap()
      
      toast.success('Login successful!')
      
      // Fetch user profile immediately after successful login
      if (loginResult.user?.id) {
        try {
          await dispatch(fetchProfile(loginResult.user.id)).unwrap()
        } catch (profileError) {
          console.error('Failed to fetch profile:', profileError)
          // Don't block login flow if profile fetch fails
        }
      }
      
      // Check if user has a role assigned
      try {
        const roleData = await dispatch(checkRoleStatusThunk()).unwrap()
        if (roleData && roleData.role_name) {
          // User has a role - now check tutorial status
          const tutorialStatus = loginResult.user?.tutorial_status
          
          // Treat 'complete' and 'skipped' the same - user doesn't need to see tutorial
          if (tutorialStatus === 'complete' || tutorialStatus === 'skipped') {
            // Tutorial completed or skipped, go to contest registration
            console.log('✅ User has role and completed/skipped tutorial - redirecting to contest registration')
            router.push('/contests/register')
          } else {
            // Tutorial incomplete or not started - go to profile to start/continue tutorial
            console.log('⚠️ User has role but tutorial incomplete - redirecting to profile to start tutorial')
            
            // Reset tutorial to start from beginning (step 0)
            localStorage.removeItem('techvruk_tutorial_state')
            localStorage.removeItem('techvruk_tutorial_completed')
            
            router.push('/profile')
          }
        } else {
          // No role assigned, redirect to role selection (tutorial will start from step 0)
          console.log('⚠️ User has no role - redirecting to select-role')
          
          // Reset tutorial state
          localStorage.removeItem('techvruk_tutorial_state')
          localStorage.removeItem('techvruk_tutorial_completed')
          
          router.push('/select-role')
        }
      } catch {
        // Fallback to role selection on error (e.g. 404)
        console.log('⚠️ Error checking role - redirecting to select-role')
        
        // Reset tutorial state
        localStorage.removeItem('techvruk_tutorial_state')
        localStorage.removeItem('techvruk_tutorial_completed')
        
        router.push('/select-role')
      }
    } catch (error) {
      const errorMessage = error as string
      toast.error(errorMessage)
    }
  }

  const isAuthenticated = (): boolean => {
    // First check if tokens exist in cookies (most reliable)
    const tokens = tokenStorage.getStoredTokens()
    if (tokens && !tokenStorage.isTokenExpired()) {
      return true
    }
    
    // Fallback: check if user exists in Redux state
    if (authState && user) {
      return true
    }
    
    return false
  }

  const logout = () => {
    // Clear tokens and auth state
    dispatch(clearAuth())
    
    // Clear notification summary dismissal data
    clearNotificationSummaryData()
    
    toast.success('Logged out successfully')
    router.push('/')
  }

  return {
    registerUser,
    loginUser,
    logout,
    isAuthenticated,
    isLoading,
    user,
    error,
  }
}
