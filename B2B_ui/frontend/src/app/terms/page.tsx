'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-gray-50 dark:bg-brand-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/register" 
              className="inline-flex items-center gap-2 text-brand-blue-600 dark:text-brand-purple-400 hover:text-brand-blue-700 dark:hover:text-brand-purple-300 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Register
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-brand-purple-600 dark:text-brand-purple-400" />
              <h1 className="text-3xl font-bold text-brand-gray-900 dark:text-white">Terms of Service</h1>
            </div>
            <p className="text-brand-gray-600 dark:text-brand-gray-400">
              Last updated: October 14, 2025
            </p>
          </div>

          {/* Content */}
          <Card className="dark:bg-brand-gray-800 dark:border-brand-gray-700">
            <CardContent className="p-6 md:p-8 space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  1. Acceptance of Terms
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  By accessing and using Techvruk (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  2. Use License
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed mb-3">
                  Permission is granted to temporarily access the Service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside space-y-2 text-brand-gray-700 dark:text-brand-gray-300 ml-4">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or public display</li>
                  <li>Attempt to decompile or reverse engineer any software contained on the Service</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                  <li>Transfer the materials to another person or &quot;mirror&quot; the materials on any other server</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  3. User Accounts
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed mb-3">
                  When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
                </p>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  4. Intellectual Property
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  The Service and its original content, features, and functionality are and will remain the exclusive property of Techvruk and its licensors. The Service is protected by copyright, trademark, and other laws.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  5. Prohibited Activities
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed mb-3">
                  You agree not to engage in any of the following prohibited activities:
                </p>
                <ul className="list-disc list-inside space-y-2 text-brand-gray-700 dark:text-brand-gray-300 ml-4">
                  <li>Copying, distributing, or disclosing any part of the Service</li>
                  <li>Using any automated system to access the Service</li>
                  <li>Transmitting spam, chain letters, or other unsolicited email</li>
                  <li>Attempting to interfere with or compromise the system integrity or security</li>
                  <li>Collecting or tracking personal information of others</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  6. Termination
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  7. Limitation of Liability
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  In no event shall Techvruk, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  8. Changes to Terms
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  9. Contact Us
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  If you have any questions about these Terms, please contact us at{' '}
                  <a href="mailto:legal@techvruk.com" className="text-brand-blue-600 dark:text-brand-purple-400 hover:underline">
                    legal@techvruk.com
                  </a>
                </p>
              </section>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-brand-gray-600 dark:text-brand-gray-400">
            <Link href="/privacy" className="hover:text-brand-blue-600 dark:hover:text-brand-purple-400 transition-colors">
              Privacy Policy
            </Link>
            {' '} • {' '}
            <Link href="/" className="hover:text-brand-blue-600 dark:hover:text-brand-purple-400 transition-colors">
              Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
