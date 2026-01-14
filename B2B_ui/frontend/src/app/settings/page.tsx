'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  User, 
  Moon,
  ChevronRight,
  UserX,
  HelpCircle,
  GraduationCap
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRestartTutorial, useTutorialStatus } from '@/components/common/UserTutorial'

const SettingsPage = () => {
  const { restartTutorial } = useRestartTutorial();
  const tutorialStatus = useTutorialStatus();
  
  const settingsCategories = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your personal information and profile settings',
      icon: User,
      href: '/settings/profile',
      color: 'text-brand-purple-600 dark:text-brand-purple-400',
      bgColor: 'bg-brand-purple-100 dark:bg-brand-purple-950'
    },
    // Notifications UI removed - navigation available via hamburger menu
    {
      id: 'appearance',
      title: 'Theme & Appearance',
      description: 'Dark mode, light mode, and display preferences',
      icon: Moon,
      href: '/settings/theme',
      color: 'text-brand-purple-600 dark:text-brand-purple-400',
      bgColor: 'bg-brand-purple-100 dark:bg-brand-purple-950'
    },
    {
      id: 'faq',
      title: 'FAQ',
      description: 'Frequently asked questions and helpful information',
      icon: HelpCircle,
      href: '/faq',
      color: 'text-brand-purple-600 dark:text-brand-purple-400',
      bgColor: 'bg-brand-purple-100 dark:bg-brand-purple-950'
    },
    {
      id: 'account',
      title: 'Account Management',
      description: 'Deactivate or delete your account',
      icon: UserX,
      href: '/settings/account',
      color: 'text-brand-error-600 dark:text-brand-error-400',
      bgColor: 'bg-brand-error-50 dark:bg-brand-error-950'
    }
  ]

  return (
    <div className="min-h-screen bg-background dark:bg-black">

      {/* Settings Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tutorial Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Card className="border border-border bg-card rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950">
                    <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      User Tutorial
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Take a guided tour of TechVruk&apos;s main features. Learn how to navigate notifications, profile, settings, and connections.
                    </p>
                    {tutorialStatus && (
                      <div className="mb-4">
                        {tutorialStatus.status === 'completed' && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 rounded-full text-sm">
                            <span className="font-medium">✓ Tutorial Completed</span>
                            {tutorialStatus.completedAt && (
                              <span className="text-xs opacity-75">
                                {new Date(tutorialStatus.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                        {tutorialStatus.status === 'skipped' && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-full text-sm">
                            <span className="font-medium">Tutorial Skipped</span>
                          </div>
                        )}
                      </div>
                    )}
                    <Button
                      onClick={restartTutorial}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                    >
                      {tutorialStatus?.status === 'completed' || tutorialStatus?.status === 'skipped' 
                        ? 'Restart Tutorial' 
                        : 'Start Tutorial'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {settingsCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="h-full"
            >
              <Link href={category.href} className="block h-full">
                <Card className="h-full group hover:shadow-lg transition-all duration-200 cursor-pointer border border-border hover:border-primary/50 bg-card rounded-3xl">
                  <CardContent className="p-6 h-full">
                    <div className="flex items-start justify-between h-full">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`p-3 rounded-xl ${category.bgColor}`}>
                          <category.icon className={`h-6 w-6 ${category.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                            {category.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
