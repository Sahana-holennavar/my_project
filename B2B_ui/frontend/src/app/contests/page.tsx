'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Zap, HelpCircle, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function ContestsPage() {
  const router = useRouter()
  const [showFaq, setShowFaq] = useState(false)
  const [openItem, setOpenItem] = useState<string | null>(null)

  const isLoggedIn = () => {
    if (typeof document === 'undefined') return false
    return document.cookie.split('; ').some(c => c.startsWith('access_token='))
  }

  const handleRegisterClick = () => {
    if (isLoggedIn()) {
      router.push('/contests/register')
    } else {
      router.push('/login?redirect=/contests/register')
    }
  }

  // FAQ content
  const faqs = [
    {
      title: 'Eligibility',
      items: [
        {
          q: 'Can a team have members from different colleges?',
          a: 'Yes, as long as all members are final-year students in the eligible degree programs (B.E, B.Tech, M.Tech, BCA, MCA, B.Sc, M.Sc) within India.'
        },
        {
          q: 'I have already graduated; can I still participate?',
          a: 'No. This contest is specifically designed for current final-year students to encourage academic innovation.'
        }
      ]
    },
    {
      title: 'Project Submissions & Updates',
      items: [
        {
          q: 'What should I include in my monthly updates?',
          a: 'Updates should show progress. This can include photos of your prototype, snippets of code, flowcharts, or a brief write-up of challenges you solved during that month.'
        },
        {
          q: 'What happens if I miss a mandatory monthly post?',
          a: 'At least one post per month is mandatory for eligibility. If you miss a month, your project may be disqualified from the final evaluation.'
        }
      ]
    },
    {
      title: 'Privacy & Intellectual Property',
      items: [
        {
          q: 'Is my project idea safe on Techvruk?',
          a: 'While Techvruk provides a platform for visibility, the ownership remains with you. We recommend sharing the "what" and "why" of your project publicly, while keeping specific "how-to" secrets or sensitive code private until you have filed for protection (like a patent).'
        },
        {
          q: 'Can I submit a project that I’ve entered in another contest?',
          a: 'Yes, provided that the other contest does not claim exclusive rights to your idea.'
        }
      ]
    },
    {
      title: 'Awards & Judging',
      items: [
        {
          q: 'What are the criteria for winning?',
          a: 'Projects are judged on innovation, technical feasibility, and the impact the solution has on human life, the environment, or technology.'
        }
      ]
    },
    {
      title: 'Contact Us & Pro-Tips',
      items: [
        {
          q: 'Have questions or need assistance with your submission?',
          a: `We are here to help!

- Email Support: [Insert Email Address, e.g., support@techvruk.com] (Please allow 24–48 hours for a response during business days.)
- Technical Issues: For trouble uploading posts or accessing your account, reach out to our tech team at [Insert Tech Support Email].
- Office Address: [Insert Physical Address, if applicable], [City, State, Pin Code]
- Follow Us for Updates: [LinkedIn] | [Instagram] | [Twitter/X]

Pro-Tips:
- Subject Lines: Ask students to use a specific subject line like "Contest Query: [Project Name]" to help you sort emails faster.
- Deadline Alert: Add a note that no technical support will be provided in the final 24 hours before the registration deadline to avoid a last-minute rush.`
        }
      ]
    }
  ]

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl bg-white/20 backdrop-blur-lg rounded-3xl p-8 text-center shadow-lg space-y-8">

         {/* HEADLINE */}
<motion.h1
  initial={{ opacity: 0, y: -30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8 }}
  className="text-4xl md:text-5xl font-extrabold text-gray-900"
>
  The Techvurk 250: Honoring the Architects of Tomorrow
</motion.h1>

{/* SUBTITLE */}
<motion.p
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3 }}
  className="text-gray-700 text-lg md:text-xl max-w-3xl mx-auto mt-4"
>
  Techvurk is celebrating the brightest minds in Engineering & Technology by honoring
  250+ standout final-year projects. Join a community of pioneers and let your hard work
  take center stage. Let’s celebrate the breakthroughs that will change the world.
</motion.p>


          {/* POSTER */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center"
          >
            <Image
  src="/contests register.png"
  alt="Contest Poster"
  width={520}
  height={680}
  priority
  className="rounded-2xl shadow-2xl w-full max-w-md"
/>


          </motion.div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleRegisterClick}
              className="px-10 py-4 text-lg rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-xl"
            >
              <Zap className="w-5 h-5 mr-2" />
              Register Now
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowFaq(true)}
              className="px-8 py-4 text-lg rounded-full"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              FAQ & Contact
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ MODAL */}
      <AnimatePresence>
        {showFaq && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="bg-white rounded-3xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowFaq(false)}
                className="absolute top-4 right-4"
              >
                <X />
              </button>

              <h2 className="text-2xl font-bold mb-6">
                Frequently Asked Questions & Contact
              </h2>

              {faqs.map((section, sIdx) => (
                <div key={sIdx} className="mb-6">
                  <h3 className="font-semibold text-lg mb-2">
                    {section.title}
                  </h3>

                  {section.items.map((item, iIdx) => {
                    const id = `${sIdx}-${iIdx}`
                    const isOpen = openItem === id

                    return (
                      <div key={id} className="border rounded-xl mb-2">
                        <button
                          onClick={() => setOpenItem(isOpen ? null : id)}
                          className="w-full text-left px-4 py-3 font-medium flex justify-between"
                        >
                          {item.q}
                          <span>{isOpen ? '−' : '+'}</span>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-4 pb-3 text-gray-600 whitespace-pre-line"
                            >
                              {item.a.split('\n').map((line, idx) => {
                                // Highlight Email Support and Tech Support Email
                                if (
                                  line.includes('Email Support') ||
                                  line.includes('Tech Support Email')
                                ) {
                                  return (
                                    <div
                                      key={idx}
                                      className="bg-yellow-100 text-yellow-900 font-semibold px-3 py-2 rounded mb-1"
                                    >
                                      {line}
                                    </div>
                                  )
                                }
                                return <p key={idx}>{line}</p>
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
