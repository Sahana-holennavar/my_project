'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { loginSchemaWithRemember } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import type { LoginData } from '@/types/auth'

interface LoginFormData {
  email: string
  password: string
  remember_me: boolean
}

function LoginPageContent() {
  const { loginUser, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  // ✅ IMPORTANT LINE
  const redirectTo = searchParams.get('redirect') || '/profile'

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchemaWithRemember),
    defaultValues: {
      email: '',
      password: '',
      remember_me: false,
    },
    mode: 'onChange'
  })

  const handleSubmit = async (data: LoginFormData) => {
    const loginData: LoginData = {
      email: data.email,
      password: data.password,
      remember_me: data.remember_me,
    }

    const success = await loginUser(loginData)

    // ✅ Redirect ONLY after successful login
    if (success !== false) {
      router.replace(redirectTo)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-100 via-brand-purple-50 to-brand-pink-100 dark:from-brand-gray-950 dark:via-brand-gray-900 dark:to-brand-gray-950 flex items-center justify-center p-2 md:p-4 relative overflow-hidden">
      
      <div className="w-full max-w-md mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-brand-blue-600 dark:text-brand-purple-400" />
            <h1 className="text-2xl font-bold">Welcome Back to Techvruk</h1>
          </div>
        </motion.div>

        <motion.div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} type={showPassword ? 'text' : 'password'} />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5"
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remember me */}
              <FormField
                control={form.control}
                name="remember_me"
                render={({ field }) => (
                  <FormItem className="flex gap-2 items-center">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel>Remember me</FormLabel>
                  </FormItem>
                )}
              />

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm mt-4">
                <Link href="/forgot-password">Forgot password?</Link>
              </div>

            </form>
          </Form>
        </motion.div>

        <div className="mt-6 text-center text-sm">
          <Link href="/" className="flex items-center justify-center gap-1">
            <ArrowRight className="rotate-180 w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginPageContent />
}
