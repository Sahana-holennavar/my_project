'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle, Sparkles, Mail, Lock } from 'lucide-react'
import Link from 'next/link'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Simple registration schema - ONLY email and password (as per API docs)
const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
}
function RegisterPageContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange'
  })

  const handleSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      // Call register API (ONLY email and password as per backend docs)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Show success message
        toast.success('Registration successful! Please login to continue.')
        // Redirect to login after 1.5 seconds
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } else {
        // Show error from backend
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: { message: string }) => {
            toast.error(error.message)
          })
        } else {
          toast.error(result.message || 'Registration failed')
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderPasswordStrength = (password: string) => {
    const requirements = [
      { test: password.length >= 8, label: 'At least 8 characters' },
      { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
      { test: /[a-z]/.test(password), label: 'One lowercase letter' },
      { test: /\d/.test(password), label: 'One number' },
    ]

    const strength = requirements.filter(req => req.test).length
    const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']
    const strengthColors = ['bg-brand-error-500', 'bg-brand-warning-500', 'bg-brand-info-500', 'bg-brand-success-500']

    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-brand-gray-200 dark:bg-brand-gray-700 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${strengthColors[strength - 1] || 'bg-brand-gray-300 dark:bg-brand-gray-600'}`}
              style={{ width: `${(strength / 4) * 100}%` }}
            />
          </div>
          <span className="text-xs text-brand-gray-600 dark:text-brand-gray-400">
            {strength > 0 ? strengthLabels[strength - 1] : 'Too weak'}
          </span>
        </div>
        {password && (
          <div className="space-y-1">
            <p className="text-xs text-brand-gray-600 dark:text-brand-gray-400">Requirements:</p>
            {requirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <CheckCircle 
                  className={`w-3 h-3 ${req.test ? 'text-brand-success-500 dark:text-brand-success-400' : 'text-brand-gray-300 dark:text-brand-gray-600'}`}
                />
                <span className={req.test ? 'text-brand-success-600 dark:text-brand-success-400' : 'text-brand-gray-600 dark:text-brand-gray-400'}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-100 via-brand-purple-50 to-brand-pink-100 dark:from-brand-gray-950 dark:via-brand-gray-900 dark:to-brand-gray-950 flex items-center justify-center p-2 md:p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-blue-400/20 dark:bg-brand-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-purple-400/20 dark:bg-brand-blue-600/10 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="w-full max-w-md mx-auto z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-brand-blue-600 dark:text-brand-purple-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-brand-gray-900 dark:text-white">Join Techvruk</h1>
          </div>
          <p className="text-brand-gray-600 dark:text-brand-gray-400 text-sm">Create your account in seconds</p>
        </motion.div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-brand-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 md:p-8 border border-white/20 dark:border-brand-gray-700/50"
        >
          {/* Form Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Create Account</h2>
            <p className="text-sm text-brand-gray-600 dark:text-brand-gray-400 mt-1">Fill in your details to get started</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-gray-700 dark:text-brand-gray-300 font-medium">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10 h-11 bg-white dark:!bg-white text-brand-gray-900 dark:text-brand-gray-900 border-brand-gray-200 dark:border-brand-gray-600 focus:border-brand-blue-500 dark:focus:border-brand-purple-500 focus:ring-2 focus:ring-brand-blue-500/20 dark:focus:ring-brand-purple-500/20 transition-all placeholder:text-brand-gray-400"
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-brand-red-500 text-sm" />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-gray-700 dark:text-brand-gray-300 font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400" />
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          className="pl-10 pr-10 h-11 bg-white dark:!bg-white text-brand-gray-900 dark:text-brand-gray-900 border-brand-gray-200 dark:border-brand-gray-600 focus:border-brand-blue-500 dark:focus:border-brand-purple-500 focus:ring-2 focus:ring-brand-blue-500/20 dark:focus:ring-brand-purple-500/20 transition-all placeholder:text-brand-gray-400"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-brand-gray-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-brand-red-500 text-sm" />
                    {field.value && renderPasswordStrength(field.value)}
                  </FormItem>
                )}
              />

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-gray-700 dark:text-brand-gray-300 font-medium">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          className={`pl-10 pr-10 h-11 bg-white dark:!bg-white text-brand-gray-900 dark:text-brand-gray-900 border-2 transition-all placeholder:text-brand-gray-400 ${
                            form.watch('confirmPassword') && form.watch('password') && form.watch('confirmPassword') !== form.watch('password')
                              ? 'border-red-500 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/20'
                              : form.watch('confirmPassword') && form.watch('password') && form.watch('confirmPassword') === form.watch('password')
                                ? 'border-green-500 dark:border-green-500 focus:border-green-500 dark:focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-500/20'
                                : 'border-brand-gray-200 dark:border-brand-gray-600 focus:border-brand-blue-500 dark:focus:border-brand-purple-500 focus:ring-2 focus:ring-brand-blue-500/20 dark:focus:ring-brand-purple-500/20'
                            }`}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-brand-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400 text-sm font-medium" />
                    {form.watch('confirmPassword') && form.watch('password') && form.watch('confirmPassword') === form.watch('password') && !form.formState.errors.confirmPassword && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Passwords match
                      </p>
                    )}
                  </FormItem>
                )}
              />
              {/* Submit Button */}
              <Button
                type="submit"
                style={{ 
                  backgroundColor: 'var(--color-brand-purple-600)',
                  color: 'white'
                }}
                className="w-full h-11 hover:opacity-90 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
                disabled={isLoading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-brand-purple-700)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-brand-purple-600)';
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </Form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-brand-gray-600 dark:text-brand-gray-400 text-sm">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-brand-blue-600 dark:text-brand-purple-400 hover:text-brand-blue-700 dark:hover:text-brand-purple-300 font-semibold hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Info Note */}
          <div className="mt-6 p-4 bg-brand-blue-50 dark:bg-brand-purple-900/20 rounded-lg border border-brand-blue-100 dark:border-brand-purple-700/30">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-brand-blue-600 dark:text-brand-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-brand-blue-900 dark:text-brand-purple-100 font-medium">Quick Start Process</p>
                <p className="text-xs text-brand-blue-700 dark:text-brand-purple-200 mt-1">
                  After registration, login and select your role (Student or Professional) to complete your profile
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-white dark:bg-brand-gray-800 rounded-lg border border-brand-gray-200 dark:border-brand-gray-700 text-center"
        >
          <p className="text-xs text-brand-gray-600 dark:text-brand-gray-400">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-brand-blue-600 dark:text-brand-purple-400 hover:underline font-medium">
              Terms of Service
            </Link>
            {' '}&{' '}
            <Link href="/privacy" className="text-brand-blue-600 dark:text-brand-purple-400 hover:underline font-medium">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return <RegisterPageContent />
}
