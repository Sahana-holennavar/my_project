"use client";

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  ArrowRight,
  Zap,
  BookOpen
} from 'lucide-react'
import { Trophy } from 'lucide-react'

export default function LandingPage() {
  const handleScrollToFeatures = () => {
    const featuresSection = document.getElementById('features')
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-50 via-white to-brand-purple-50 dark:from-brand-gray-950 dark:via-brand-gray-900 dark:to-brand-gray-950 flex flex-col">
      {/* --- Hero Section --- */}
  <section className="w-full px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16 lg:px-8 lg:pt-32 lg:pb-24 bg-brand-purple-50 dark:bg-brand-gray-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-4 sm:mb-6 border-brand-blue-200 dark:border-brand-purple-800 bg-brand-blue-50 dark:bg-brand-purple-950 text-brand-blue-800 dark:text-brand-purple-200">
            <span className="mr-2">🚀</span>
            Highly anticipated launch next week!
          </Badge>
        </motion.div>
        {/* Trophy quick link to contest */}
        <div className="fixed top-6 right-6 z-50">
          <Link href="/challenge/1" aria-label="Open contest">
            <div className="p-3 rounded-full bg-white dark:bg-neutral-800 shadow-lg hover:shadow-xl transition">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
          </Link>
        </div>
        <motion.h1 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4 sm:mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Don&apos;t Just Follow Tech.<br />
          <span className="text-brand-blue-600 dark:text-brand-purple-400">Lead It.</span>
        </motion.h1>
        <motion.p 
          className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg lg:text-xl text-gray-700 dark:text-brand-gray-300 px-4 sm:px-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Techvruk is the new dynamic platform for tech professionals and students to stay at the forefront of technological advancements. Get breaking news, in-depth analysis, and invaluable career guidance.
        </motion.p>
        <motion.div 
          className="mt-8 sm:mt-10 flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row px-4 sm:px-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link href="/register">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-brand-purple-600 hover:bg-brand-purple-700 dark:bg-brand-purple-600 dark:hover:bg-brand-purple-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Get Early Access
                <motion.div
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="inline-block"
                >
                  <ArrowRight className="ml-2 h-4 w-4" />
                </motion.div>
              </Button>
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleScrollToFeatures}
              className="w-full sm:w-auto border-brand-blue-600 text-brand-blue-600 hover:bg-brand-blue-50 dark:border-brand-purple-400 dark:text-brand-purple-400 dark:hover:bg-brand-purple-950 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Learn More
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="bg-brand-gray-50 py-16 sm:py-20 lg:py-24 dark:bg-brand-gray-900">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-brand-gray-600 dark:text-brand-gray-400 px-4 sm:px-0">
              Techvruk is poised to become your indispensable resource.
            </p>
          </motion.div>
          <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="flex flex-col h-full border-brand-gray-200 dark:border-brand-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-brand-blue-100 dark:bg-brand-blue-900/50">
                    <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-brand-blue-600 dark:text-brand-blue-400" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">Instant Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-brand-gray-600 dark:text-brand-gray-400">
                    Cut through the noise. Get instant alerts on breaking tech evolutions that are relevant and impactful for your industry.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="flex flex-col h-full border-brand-gray-200 dark:border-brand-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-brand-blue-100 dark:bg-brand-blue-900/50">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-brand-blue-600 dark:text-brand-blue-400" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">Exclusive Deep Dives</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-brand-gray-600 dark:text-brand-gray-400">
                    Go beyond the headlines with in-depth analyses of complex topics like AI, blockchain, and quantum computing.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="flex flex-col h-full border-brand-gray-200 dark:border-brand-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-brand-blue-100 dark:bg-brand-blue-900/50">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-brand-blue-600 dark:text-brand-blue-400" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">Expert Career Guidance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-brand-gray-600 dark:text-brand-gray-400">
                    Accelerate your career with mentorship sessions, actionable advice, and skill development from proven industry experts.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- Mentorship Section --- */}
      <section id="mentorship" className="py-16 sm:py-20 lg:py-24 bg-white dark:bg-brand-gray-950">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 sm:gap-12 grid-cols-1 md:grid-cols-2">
            <motion.div 
              className="order-2 md:order-1"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Badge variant="secondary" className="mb-4 bg-brand-gray-100 text-gray-900 dark:bg-brand-gray-800 dark:text-brand-gray-50">
                Career Development
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-brand-gray-900 dark:text-white">
                Learn from Industry Experts
              </h2>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg text-brand-gray-600 dark:text-brand-gray-400">
                Techvruk isn&apos;t just about information; it&apos;s about growth. Our exclusive mentorship sessions provide invaluable guidance on career paths, skill development, and networking.
              </p>
              <ul className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-brand-blue-600 dark:text-brand-blue-400 mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <span className="ml-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">Actionable advice to navigate your career.</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-brand-blue-600 dark:text-brand-blue-400 mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <span className="ml-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">Personalized insights on emerging skill sets.</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-brand-blue-600 dark:text-brand-blue-400 mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <span className="ml-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">Exclusive networking opportunities.</span>
                </li>
              </ul>
            </motion.div>
            <motion.div 
              className="order-1 md:order-2"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Image
                className="w-full rounded-xl shadow-xl border border-brand-gray-200 dark:border-brand-gray-800"
                src="https://placehold.co/600x400/1e40af/ffffff?text=Mentorship+Session&font=inter"
                alt="Mentorship session placeholder"
                width={600}
                height={400}
                unoptimized
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- Founder Quote Section --- */}
      <section id="about" className="bg-brand-gray-50 py-16 sm:py-20 lg:py-24 dark:bg-brand-gray-900">
        <div className="container mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="border-2 border-brand-blue-600/50 dark:border-brand-purple-600/50 bg-brand-blue-50/50 dark:bg-brand-blue-900/20 p-6 sm:p-8 shadow-xl">
              <blockquote className="text-lg sm:text-xl font-medium italic text-gray-800 dark:text-brand-gray-200">
                As a seasoned tech professional, I saw too many peers and students fall behind, overwhelmed by noise. I founded Techvruk to be the signal in that noise—a go-to source for what truly matters.
              </blockquote>
              <footer className="mt-6">
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Vinay </div>
                <div className="text-sm text-gray-700 dark:text-brand-gray-400">Founder, Techvruk</div>
              </footer>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* --- Final CTA Section --- */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white dark:bg-brand-gray-950">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="overflow-hidden rounded-2xl bg-brand-purple-500 dark:bg-brand-purple-800 shadow-2xl">
              <div className="px-6 py-12 sm:px-12 sm:py-16 lg:px-20 lg:py-20 text-center">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-4 sm:mb-6">
                  The future of tech is here.
                </h2>
                <p className="mt-4 text-base sm:text-lg lg:text-xl text-white/90 max-w-2xl mx-auto mb-8 sm:mb-10 px-4 sm:px-0">
                  Don&apos;t get left behind. Join the waitlist to be the first to know when we launch and get exclusive day-one access.
                </p>
                <div className="flex justify-center">
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="w-full sm:w-auto bg-white text-brand-blue-600 hover:bg-brand-gray-100 dark:bg-white dark:text-brand-purple-600 dark:hover:bg-brand-gray-100 shadow-lg"
                  >
                    Sign Up Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* --- Footer Section (FIXED) --- */}
      <footer className="bg-white/80 dark:bg-neutral-950/80 text-neutral-900 dark:text-white border-t border-neutral-200 dark:border-neutral-800/70 backdrop-blur-sm py-6">
  <div className="container mx-auto px-4">
          
          {/* Footer top content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Company Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative h-10 w-10 bg-neutral-900 dark:bg-neutral-800 rounded-lg flex items-center justify-center transition-transform hover:scale-105 shadow-sm">
                  <Image
                    src="/logo.png"
                    alt="Techvruk Logo"
                    width={36}
                    height={36}
                    className="w-7 h-7 object-contain"
                    priority
                  />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-brand-purple-200">Techvruk</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Empowering businesses with cutting-edge solutions.
              </p>
            </motion.div>

            {/* Legal Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/privacy" className="text-gray-700 dark:text-brand-gray-300 hover:text-gray-900 dark:hover:text-brand-purple-200 transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="/terms" className="text-gray-700 dark:text-brand-gray-300 hover:text-gray-900 dark:hover:text-brand-purple-200 transition-colors">Terms & Conditions</a>
                </li>
              </ul>
            </motion.div>

            {/* Help & Account Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Help & Account</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/faq" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</a>
                </li>
                <li>
                  <a href="/login" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Login</a>
                </li>
                <li>
                  <a href="/register" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Register</a>
                </li>
              </ul>
            </motion.div>
          </div>
          
          {/* Footer bottom content (credits) */}
          <motion.div 
            className="border-t border-brand-gray-800 dark:border-brand-gray-700 mt-12 pt-8 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <p className="text-gray-600 dark:text-gray-300">
              <span>© 2025 All rights reserved by TryNeu Global Solutions Private Limited</span>
            </p>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              <span>Developed by Sitramix OPC Pvt Ltd</span>
            </p>
          </motion.div>

        </div>
      </footer>
    </div>
  );
}

