'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function PrivacyPage() {
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
              <Shield className="w-8 h-8 text-brand-purple-600 dark:text-brand-purple-400" />
              <h1 className="text-3xl font-bold text-brand-gray-900 dark:text-white">Privacy Policy</h1>
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
                  1. Introduction
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  Welcome to Techvruk (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  2. Information We Collect
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed mb-3">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-brand-gray-700 dark:text-brand-gray-300 ml-4">
                  <li><strong>Account Information:</strong> Name, email address, password, and user type</li>
                  <li><strong>Profile Information:</strong> Additional details you choose to provide</li>
                  <li><strong>Communication Data:</strong> Messages, feedback, and support requests</li>
                  <li><strong>Usage Data:</strong> Information about how you use our Service</li>
                  <li><strong>Device Information:</strong> Browser type, IP address, and operating system</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  3. How We Use Your Information
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed mb-3">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-brand-gray-700 dark:text-brand-gray-300 ml-4">
                  <li>Provide, maintain, and improve our Service</li>
                  <li>Process your transactions and send related information</li>
                  <li>Send you technical notices, updates, and support messages</li>
                  <li>Respond to your comments, questions, and customer service requests</li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                  <li>Detect, prevent, and address technical issues and security threats</li>
                  <li>Personalize and improve your experience</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  4. Information Sharing and Disclosure
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed mb-3">
                  We do not sell your personal information. We may share your information in the following situations:
                </p>
                <ul className="list-disc list-inside space-y-2 text-brand-gray-700 dark:text-brand-gray-300 ml-4">
                  <li><strong>With Your Consent:</strong> When you give us permission to share your information</li>
                  <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  5. Data Security
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  6. Data Retention
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  7. Your Rights
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed mb-3">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-brand-gray-700 dark:text-brand-gray-300 ml-4">
                  <li>Access and receive a copy of your personal information</li>
                  <li>Correct inaccurate or incomplete information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to or restrict the processing of your information</li>
                  <li>Withdraw your consent at any time</li>
                  <li>Data portability</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  8. Cookies and Tracking Technologies
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  We use cookies and similar tracking technologies to track activity on our Service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  9. Children&apos;s Privacy
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe we have collected information from your child, please contact us.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  10. Changes to This Privacy Policy
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-3">
                  11. Contact Us
                </h2>
                <p className="text-brand-gray-700 dark:text-brand-gray-300 leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at{' '}
                  <a href="mailto:privacy@techvruk.com" className="text-brand-blue-600 dark:text-brand-purple-400 hover:underline">
                    privacy@techvruk.com
                  </a>
                </p>
              </section>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-brand-gray-600 dark:text-brand-gray-400">
            <Link href="/terms" className="hover:text-brand-blue-600 dark:hover:text-brand-purple-400 transition-colors">
              Terms of Service
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
