'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Search, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
}

const FAQPage = () => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Dynamic FAQ data array
  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'How do I edit my profile information?',
      answer: 'Go to Settings > Profile to update your personal information, professional summary, contact details, and privacy settings. Changes are saved automatically when you click the Save button.',
      category: 'Profile'
    },
    {
      id: '2',
      question: 'How do I change my privacy settings?',
      answer: 'Navigate to Settings > Profile and scroll to the Privacy Settings section. You can control who sees your contact information, experience, skills, and whether recruiters can contact you.',
      category: 'Privacy'
    },
    {
      id: '3',
      question: 'Can I switch between dark mode and light mode?',
      answer: 'Yes! Go to Settings > Theme & Appearance to toggle between dark mode, light mode, or use system preferences. Your theme preference is saved automatically.',
      category: 'Appearance'
    },
    {
      id: '4',
      question: 'How do I manage my notification preferences?',
      answer: 'Visit Settings > Notifications to customize your email, push, and in-app notification preferences. You can choose which types of notifications you want to receive.',
      category: 'Notifications'
    },
    {
      id: '5',
      question: 'How do I add work experience to my profile?',
      answer: 'On your profile page, click the "+" button in the Experience section. Fill in your job title, company, dates, and description. You can add multiple positions and reorder them as needed.',
      category: 'Profile'
    },
    {
      id: '6',
      question: 'How do I add skills to my profile?',
      answer: 'In the Skills section of your profile, click "Add Skill". Enter the skill name and select your proficiency level (Beginner, Intermediate, Advanced, Expert). You can add unlimited skills.',
      category: 'Profile'
    },
    {
      id: '7',
      question: 'Can I hide my profile from certain people?',
      answer: 'Yes, you can control your profile visibility through Privacy Settings. Choose between "Public", "Connections Only", or "Private" to control who can view your profile information.',
      category: 'Privacy'
    },
    {
      id: '8',
      question: 'How do I deactivate my account?',
      answer: 'Go to Settings > Account Management > Deactivate Account. Follow the prompts to temporarily deactivate your account. You can reactivate it anytime by logging back in.',
      category: 'Account'
    },
    {
      id: '9',
      question: 'How do I delete my account permanently?',
      answer: 'Navigate to Settings > Account Management and select "Delete Account". Please note that this action is permanent and cannot be undone. All your data will be removed from our systems.',
      category: 'Account'
    },
    {
      id: '10',
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on the login page. Enter your email address and follow the instructions sent to your email to reset your password securely.',
      category: 'Security'
    },
    {
      id: '11',
      question: 'Can I add certifications and awards?',
      answer: 'Yes! Your profile includes dedicated sections for Certifications and Awards. Click the "+" button in each section to add your achievements with details like issuing organization and dates.',
      category: 'Profile'
    },
    {
      id: '12',
      question: 'How do I connect with other professionals?',
      answer: 'Browse the feed, search for professionals in your industry, and click "Connect" on their profiles. You can also send personalized connection requests with a message.',
      category: 'Networking'
    },
    {
      id: '13',
      question: 'How do I share posts or updates?',
      answer: 'Click the "Create Post" button in your feed. You can share text updates, images, videos, or documents. Add hashtags to increase visibility and engage with your network.',
      category: 'Posts'
    },
    {
      id: '14',
      question: 'Can I control who sees my posts?',
      answer: 'Yes, when creating a post, you can select the audience: "Public", "Connections Only", or "Private". This gives you full control over post visibility.',
      category: 'Privacy'
    },
    {
      id: '15',
      question: 'How do I add my education history?',
      answer: 'In the Education section of your profile, click "Add Education". Enter your school/university name, degree, field of study, and dates attended. You can add multiple educational qualifications.',
      category: 'Profile'
    }
  ]

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(faqData.map(item => item.category)))]

  // Filter FAQ items based on search and category
  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>
          
          <h1 className="text-3xl font-bold text-foreground">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-muted-foreground">
            Find answers to common questions about using the platform
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted border border-border'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No questions found matching your search.
              </p>
            </div>
          ) : (
            filteredFAQs.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full mt-1">
                        {item.category}
                      </span>
                      <h3 className="text-base font-semibold text-foreground flex-1">
                        {item.question}
                      </h3>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {expandedId === item.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedId === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 pt-2 pl-16">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Still need help?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Can&apos;t find what you&apos;re looking for? Check out our Help Center for more information.
          </p>
        </div>
      </div>
    </div>
  )
}

export default FAQPage
