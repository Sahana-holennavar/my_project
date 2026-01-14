'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BaseComponentProps } from '@/types'

interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function Loading({ size = 'md', text = "Initializing application...", className = '' }: LoadingProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center ${className} overflow-hidden transition-colors duration-300`}
      style={{ minHeight: '100vh', minWidth: '100vw', background: mounted ? undefined : '#f3f4f6' }}
    >
      {/* Always render the background container for hydration match */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        {mounted ? (
          <>
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-blue-200 dark:bg-brand-purple-900 opacity-30 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-purple-200 dark:bg-brand-blue-900 opacity-30 rounded-full blur-3xl" />
          </>
        ) : null}
      </div>
      {/* Spinner and text directly on background */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.div
          className={`rounded-full border-4 border-brand-gray-200 dark:border-brand-gray-800 border-t-brand-blue-600 dark:border-t-brand-purple-400 border-b-brand-blue-400 dark:border-b-brand-purple-600 bg-brand-blue-100 dark:bg-transparent shadow-lg ${sizeClasses[size]}`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.5, // Faster spin
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        {text && (
          <motion.p
            className="mt-6 text-lg font-semibold text-brand-gray-800 dark:text-brand-gray-100 tracking-wide text-center drop-shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    </div>
  )
}
