'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Briefcase, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { assignRole, checkRoleStatus } from '@/store/slices/authSlice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loading } from '@/components/common/loading'
import { UserTutorial } from '@/components/common/UserTutorial'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api'
import '@/styles/tutorial.css'

export default function SelectRolePage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { isLoading } = useAppSelector((state) => state.auth)
  const { isAuthenticated } = useAuth()
  const [selectedRole, setSelectedRole] = useState<'student' | 'professional' | null>(null)
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    (async () => {
      try {
        const response = await authApi.getRoleStatus()
        const role = response?.data?.role_name
        if (role === 'student' || role === 'professional') {
          router.replace('/profile')
        } else {
          setCanRender(true)
        }
      } catch {
        setCanRender(true)
      }
    })()
  }, [isAuthenticated, router])

  if (!canRender) {
    return null
  }

  const handleRoleSelect = (role: 'student' | 'professional') => {
    setSelectedRole(role)
  }

  const handleSubmit = async () => {
    if (!selectedRole) return

    try {
      // Step 1: Assign the role via API
      await dispatch(assignRole(selectedRole)).unwrap()
      
      // Step 2: Fetch and update the role status in Redux state
      await dispatch(checkRoleStatus()).unwrap()
      
      toast.success('Role assigned successfully!')
      
      // Step 3: Redirect to profile
      router.push('/profile')
    } catch (error) {
      const errorMessage = error as string
      toast.error(errorMessage)
    }
  }

  // DEV ONLY: Reset tutorial for testing
  const resetTutorial = () => {
    localStorage.removeItem('techvruk_tutorial_completed')
    toast.success('Tutorial reset! Reloading...')
    setTimeout(() => window.location.reload(), 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-100 via-brand-purple-50 to-brand-pink-100 dark:from-brand-gray-950 dark:via-brand-gray-900 dark:to-brand-gray-950 flex items-center justify-center p-2 md:p-4 pb-[72px] md:pb-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-blue-400/20 dark:bg-brand-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-purple-400/20 dark:bg-brand-blue-600/10 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="w-full max-w-4xl z-10">
        {/* DEV ONLY: Reset Tutorial Button */}
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            size="sm"
            onClick={resetTutorial}
            className="bg-red-500 text-white hover:bg-red-600 border-red-600"
          >
            🔄 Reset Tutorial (Dev)
          </Button>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-brand-gray-900 dark:text-white bg-gradient-to-r from-brand-gray-900 to-brand-blue-800 bg-clip-text text-transparent dark:bg-none">
              Select Your Account Type
            </h1>
            <p className="text-brand-gray-600 dark:text-brand-gray-400">Choose how you&apos;ll be using the platform</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Student Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-xl bg-white/80 dark:bg-brand-gray-800/90 border border-white/20 dark:border-brand-gray-700/50 ${
                  selectedRole === 'student' 
                    ? 'border-brand-blue-500 ring-2 ring-brand-blue-500 shadow-lg' 
                    : 'hover:border-brand-blue-300'
                }`}
                onClick={() => handleRoleSelect('student')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <User className={`h-12 w-12 ${selectedRole === 'student' ? 'text-brand-blue-600' : 'text-brand-gray-400'}`} />
                    {selectedRole === 'student' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-8 w-8 rounded-full bg-brand-blue-600 flex items-center justify-center"
                      >
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <CardTitle className="text-2xl mt-4 text-brand-gray-900 dark:text-white">Student</CardTitle>
                  <CardDescription className="dark:text-brand-gray-400">For students and educational purposes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-brand-gray-600 dark:text-brand-gray-400">
                    <li className="flex items-start">
                      <span className="mr-2 text-brand-blue-600">✓</span>
                      <span>Access to student resources</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-brand-blue-600">✓</span>
                      <span>Learning-focused workspace</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-brand-blue-600">✓</span>
                      <span>Connect with peers and mentors</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Professional Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-xl bg-white/80 dark:bg-brand-gray-800/90 border border-white/20 dark:border-brand-gray-700/50 ${
                  selectedRole === 'professional' 
                    ? 'border-brand-blue-500 ring-2 ring-brand-blue-500 shadow-lg' 
                    : 'hover:border-brand-blue-300'
                }`}
                onClick={() => handleRoleSelect('professional')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Briefcase className={`h-12 w-12 ${selectedRole === 'professional' ? 'text-brand-blue-600' : 'text-brand-gray-400'}`} />
                    {selectedRole === 'professional' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-8 w-8 rounded-full bg-brand-blue-600 flex items-center justify-center"
                      >
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <CardTitle className="text-2xl mt-4 text-brand-gray-900 dark:text-white">Professional</CardTitle>
                  <CardDescription className="dark:text-brand-gray-400">For business and professional use</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-brand-gray-600 dark:text-brand-gray-400">
                    <li className="flex items-start">
                      <span className="mr-2 text-brand-blue-600">✓</span>
                      <span>Professional account features</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-brand-blue-600">✓</span>
                      <span>Business tools and analytics</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-brand-blue-600">✓</span>
                      <span>Team collaboration workspace</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center pt-4"
          >
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!selectedRole || isLoading}
              style={{ 
                backgroundColor: 'var(--color-brand-purple-600)',
                color: 'white'
              }}
              className="min-w-[200px] hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-brand-purple-700)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-brand-purple-600)';
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loading size="sm" />
                  <span>Please wait...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Tutorial Component */}
      <UserTutorial run={canRender} />
    </div>
  )
}
