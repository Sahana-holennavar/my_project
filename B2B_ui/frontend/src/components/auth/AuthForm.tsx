'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/common/loading'

interface AuthFormProps {
  title: string
  description: string
  children: ReactNode
  onSubmit: (e: React.FormEvent) => void
  submitText: string
  isLoading?: boolean
  disabled?: boolean
  footerContent?: ReactNode
}

export function AuthForm({
  title,
  description,
  children,
  onSubmit,
  submitText,
  isLoading = false,
  disabled = false,
  footerContent,
}: AuthFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="w-full shadow-xl border-0 bg-white/95 backdrop-blur-md">
        <CardHeader className="text-center pb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-brand-gray-900 to-brand-blue-800 bg-clip-text text-transparent">
              {title}
            </CardTitle>
            <CardDescription className="text-sm text-brand-gray-600 mt-1">
              {description}
            </CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <form onSubmit={onSubmit} className="space-y-4">
              {children}
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="pt-3"
              >
                <Button
                  type="submit"
                  style={{ 
                    backgroundColor: 'var(--color-brand-purple-600)',
                    color: 'white'
                  }}
                  className="w-full hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-300 h-11"
                  disabled={disabled || isLoading}
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
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    submitText
                  )}
                </Button>
              </motion.div>
            </form>
            
            {footerContent && (
              <motion.div 
                className="mt-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {footerContent}
              </motion.div>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
