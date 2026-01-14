import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Edit3,
  X,
  Briefcase,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { assignRole } from '@/store/slices/authSlice'
import RoleSwitchModal from './RoleSwitchModal'

const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}
const modalContentVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 200 },
  },
  exit: { opacity: 0, y: -50 },
}

type ButtonProps = {
  className?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  [key: string]: unknown
}

const Button = ({ className = '', children, variant = 'primary', ...props }: ButtonProps) => {
  const baseStyle =
    'px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-sm'
  const variants = {
    primary:
      'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20',
    secondary:
      'bg-white text-neutral-800 dark:bg-neutral-800 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700',
  }
  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

type SectionProps = {
  children: React.ReactNode
  className?: string
}
const Section = ({ children, className = '' }: SectionProps) => (
  <div
    className={`border-brand-gray-200 rounded-3xl border bg-white p-6 transition-colors sm:p-8 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
  >
    {children}
  </div>
)

type EditAboutModalProps = {
  isOpen: boolean
  onClose: () => void
  aboutData: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => void
}

const EditAboutModal = ({ isOpen, onClose, aboutData, onSave }: EditAboutModalProps) => {
  const [formData, setFormData] = useState(aboutData)
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false)
  const [attemptedStatus, setAttemptedStatus] = useState<string | null>(null)
  const [isRoleSwitching, setIsRoleSwitching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const userRole = user?.role || 'student'
  
  const charCount = (formData.professional_summary as string)?.length || 0
  const industries = [
    'IT Industry',
    'Biotechnology',
    'Manufacturing',
    'Industrial Automation',
    'R&D',
    'Human Resource',
    'Construction',
    'Architecture',
    'Interior Design',
    'Design Engineer',
    'Other',
  ]

  const studentPrograms = [
    'B.Tech / B.E',
    'M.Tech',
    'B.Sc',
    'M.Sc',
    'BCA',
    'MCA',
    'Others',
  ]

  const professionOptions = userRole === 'student' ? studentPrograms : industries
 
  // Check if current industry value is "Other" or not in the predefined list
  const currentIndustry = formData.industry as string
  const otherToken = userRole === 'student' ? 'Others' : 'Other'
  const isOtherSelected = currentIndustry === otherToken || (currentIndustry && !professionOptions.slice(0, -1).includes(currentIndustry))
  const [customProfession, setCustomProfession] = useState<string>(
    isOtherSelected && currentIndustry !== otherToken ? currentIndustry : ''
  )
  
  // Role-based status definitions
  const studentStatuses = [
    'Studying',
    'Looking for internship',
    'Looking for job',
  ]
  
  const professionalStatuses = [
    'Employed',
    'Unemployed',
    'Freelancing',
    'Consulting',
    'Employer',
  ]

  React.useEffect(() => {
    setFormData(aboutData)
    // Sync custom profession state when aboutData changes
    const currentIndustry = aboutData.industry as string
    if (currentIndustry && currentIndustry !== otherToken && !professionOptions.slice(0, -1).includes(currentIndustry)) {
      setCustomProfession(currentIndustry)
    } else if (currentIndustry === otherToken || !currentIndustry) {
      setCustomProfession('')
    }
  }, [aboutData, professionOptions, otherToken])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.target.name === 'industry') {
      if (userRole === 'student') {
        if (e.target.value === 'Others') {
          setFormData({ ...formData, industry: 'Others' })
        } else {
          setFormData({ ...formData, industry: e.target.value })
          setCustomProfession('')
        }
      } else if (e.target.value === 'Other') {
        setFormData({ ...formData, industry: 'Other' })
      } else {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setCustomProfession('')
      }
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value })
    }
  }
  
  const handleCustomProfessionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    setCustomProfession(value)
    // Sanitize input: basic XSS prevention (remove script tags and special characters)
    const sanitized = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').substring(0, 100)
    if (sanitized) {
      setFormData({ ...formData, industry: sanitized })
    }
  }
  
  const handleStatusClick = (status: string) => {
    const isStudentStatus = studentStatuses.includes(status)
    const isProfessionalStatus = professionalStatuses.includes(status)
    
    // Check if user is trying to select status from other role
    if (userRole === 'student' && isProfessionalStatus) {
      setAttemptedStatus(status)
      setShowRoleSwitchModal(true)
      return
    }
    
    if (userRole === 'professional' && isStudentStatus) {
      setAttemptedStatus(status)
      setShowRoleSwitchModal(true)
      return
    }
    
    // If status is for correct role, update it
    setFormData({ ...formData, current_status: status })
  }
  
  const handleRoleSwitch = async () => {
    const targetRole = userRole === 'student' ? 'professional' : 'student';
    
    try {
      setIsRoleSwitching(true);
      
      // Call Redux action to assign new role
      await dispatch(assignRole(targetRole)).unwrap();
      
      setShowRoleSwitchModal(false);
      
      // If user had attempted to select a status, update the form with it
      if (attemptedStatus) {
        setFormData({ ...formData, current_status: attemptedStatus });
        setAttemptedStatus(null);
      }
      
      // Optional: Show success toast
      // toast.success(`Role switched to ${targetRole} successfully!`);
    } catch (error) {
      console.error('Failed to switch role:', error);
      setShowRoleSwitchModal(false);
      // Optional: Show error toast
      // toast.error('Failed to switch role');
    } finally {
      setIsRoleSwitching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      // Exclude industry from save since it's synced from personal information
      const { industry, ...dataToSave } = formData
      await onSave(dataToSave)
      onClose()
    } catch (error) {
      console.error('Failed to save about data:', error)
      // Keep modal open on error
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="edit-about-modal"
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            variants={modalContentVariants}
            onClick={(e) => e.stopPropagation()}
            className="border-brand-gray-200 w-full max-w-lg rounded-3xl border bg-white shadow-xl transition-colors dark:border-neutral-800 dark:bg-neutral-900 max-h-[90vh] overflow-y-auto pr-2 custom-scrollbar"
          >
            <div className="p-4 sm:p-6">
              <div className="mb-4 sm:mb-6 flex items-center justify-between">
                <h2 className="text-brand-gray-900 text-lg sm:text-2xl font-bold dark:text-white">
                  Edit about
                </h2>
                <button
                  className="text-brand-gray-400 hover:text-brand-gray-900 p-2 dark:text-neutral-500 dark:hover:text-white"
                  onClick={onClose}
                >
                  <X size={22} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-brand-gray-500 text-sm dark:text-neutral-400">
                    Professional Summary
                  </label>
                  <textarea
                    name="professional_summary"
                    value={formData.professional_summary as string}
                    onChange={handleChange}
                    rows={4}
                    maxLength={2000}
                    className="border-brand-gray-200 text-brand-gray-900 about-textarea-custom mt-1 w-full rounded-lg border bg-white p-3 transition-colors dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    style={{ resize: 'vertical', overflowY: 'auto' }}
                  />
                  <style jsx global>{`
                    .about-textarea-custom {
                      scrollbar-width: thin;
                      scrollbar-color: #a3a3a3 #f5f5f5;
                    }
                    .about-textarea-custom::-webkit-scrollbar {
                      width: 8px;
                    }
                    .about-textarea-custom::-webkit-scrollbar-track {
                      background: #f5f5f5;
                      border-radius: 4px;
                    }
                    .about-textarea-custom::-webkit-scrollbar-thumb {
                      background-color: #a3a3a3;
                      border-radius: 4px;
                      border: 2px solid #f5f5f5;
                    }
                    .about-textarea-custom::-webkit-scrollbar-thumb:hover {
                      background-color: #737373;
                    }
                    .dark .about-textarea-custom {
                      scrollbar-color: #525252 #262626;
                    }
                    .dark .about-textarea-custom::-webkit-scrollbar-track {
                      background: #262626;
                    }
                    .dark .about-textarea-custom::-webkit-scrollbar-thumb {
                      background-color: #525252;
                      border: 2px solid #262626;
                    }
                    .dark .about-textarea-custom::-webkit-scrollbar-thumb:hover {
                      background-color: #737373;
                    }
                    /* Responsive max-height and sizing adjustments */
                    .about-textarea-custom {
                      min-height: 100px;
                    }
                    
                    @media (max-width: 640px) {
                      .about-textarea-custom {
                        max-height: 120px !important;
                        min-height: 80px;
                        font-size: 14px;
                        padding: 8px;
                      }
                    }
                    @media (min-width: 641px) and (max-width: 768px) {
                      .about-textarea-custom {
                        max-height: 180px !important;
                        min-height: 100px;
                        font-size: 14px;
                      }
                    }
                    @media (min-width: 769px) and (max-width: 1024px) {
                      .about-textarea-custom {
                        max-height: 220px !important;
                        min-height: 120px;
                      }
                    }
                    @media (min-width: 1025px) {
                      .about-textarea-custom {
                        max-height: 280px !important;
                        min-height: 140px;
                      }
                    }
                    
                    /* Custom scrollbar for modal */
                    .custom-scrollbar {
                      scrollbar-width: thin;
                      scrollbar-color: #a3a3a3 #f5f5f5;
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                      width: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                      background: #f5f5f5;
                      border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                      background-color: #a3a3a3;
                      border-radius: 4px;
                      border: 2px solid #f5f5f5;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                      background-color: #737373;
                    }
                    .dark .custom-scrollbar {
                      scrollbar-color: #525252 #262626;
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-track {
                      background: #262626;
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                      background-color: #525252;
                      border: 2px solid #262626;
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                      background-color: #737373;
                    }
                  `}</style>
                  <p
                    className={`mt-1 text-xs ${charCount > 2000 ? 'text-red-500' : 'text-brand-gray-500 dark:text-neutral-400'}`}
                  >
                    {charCount} / 2000
                  </p>
                </div>
                <div>
                  <label className="text-brand-gray-500 text-sm dark:text-neutral-400">
                    {userRole === 'student' ? 'Program' : 'Profession'}
                  </label>
                  <p className="text-xs text-brand-gray-400 dark:text-neutral-500 mt-1 mb-2">
                    {userRole === 'student'
                      ? 'Program is synced from Personal Information. Edit it there to update.'
                      : 'Profession is synced from Personal Information. Edit it there to update.'}
                  </p>
                  <select
                    name="industry"
                    value={isOtherSelected && customProfession ? otherToken : (formData.industry as string)}
                    onChange={handleChange}
                    disabled
                    className="border-brand-gray-200 text-brand-gray-500 mt-1 w-full rounded-lg border bg-neutral-100 dark:bg-neutral-900 p-3 transition-colors dark:border-neutral-700 dark:text-neutral-400 cursor-not-allowed opacity-70"
                  >
                    <option value="">{userRole === 'student' ? 'Select Program' : 'Select Profession'}</option>
                    {professionOptions.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                  {isOtherSelected && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customProfession || (currentIndustry !== otherToken ? currentIndustry : '')}
                        onChange={handleCustomProfessionChange}
                        placeholder={userRole === 'student' ? 'Enter your program (max 100 characters)' : 'Enter your profession (max 100 characters)'}
                        maxLength={100}
                        className="border-brand-gray-200 text-brand-gray-900 mt-1 w-full rounded-lg border bg-white p-3 transition-colors dark:border-neutral-700 dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <p className="text-xs text-brand-gray-500 dark:text-neutral-400 mt-1">
                        {(customProfession || (currentIndustry !== otherToken ? currentIndustry : '')).length} / 100 characters
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-brand-gray-500 text-sm dark:text-neutral-400 mb-3 block">
                    Current Status
                  </label>
                  
                  {/* Student Statuses */}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-brand-gray-600 dark:text-neutral-500 uppercase tracking-wide mb-2">
                      Student Statuses
                    </p>
                    {studentStatuses.map((status) => {
                      const isDisabled = userRole !== 'student'
                      const isSelected = formData.current_status === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusClick(status)}
                          disabled={isDisabled}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : isDisabled
                              ? 'border-brand-gray-200 dark:border-neutral-800 bg-brand-gray-50 dark:bg-neutral-900/50 opacity-60 cursor-not-allowed'
                              : 'border-brand-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-purple-300 dark:hover:border-purple-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500'
                                  : isDisabled
                                  ? 'border-brand-gray-300 dark:border-neutral-700'
                                  : 'border-brand-gray-300 dark:border-neutral-600'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                isSelected
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : isDisabled
                                  ? 'text-brand-gray-400 dark:text-neutral-600'
                                  : 'text-brand-gray-900 dark:text-white'
                              }`}
                            >
                              {status}
                            </span>
                            {isDisabled && (
                              <span className="ml-auto text-xs text-brand-gray-400 dark:text-neutral-600">
                                Professional only
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Professional Statuses */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-brand-gray-600 dark:text-neutral-500 uppercase tracking-wide mb-2">
                      Professional Statuses
                    </p>
                    {professionalStatuses.map((status) => {
                      const isDisabled = userRole !== 'professional'
                      const isSelected = formData.current_status === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusClick(status)}
                          disabled={isDisabled}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : isDisabled
                              ? 'border-brand-gray-200 dark:border-neutral-800 bg-brand-gray-50 dark:bg-neutral-900/50 opacity-60 cursor-not-allowed'
                              : 'border-brand-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-purple-300 dark:hover:border-purple-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500'
                                  : isDisabled
                                  ? 'border-brand-gray-300 dark:border-neutral-700'
                                  : 'border-brand-gray-300 dark:border-neutral-600'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                isSelected
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : isDisabled
                                  ? 'text-brand-gray-400 dark:text-neutral-600'
                                  : 'text-brand-gray-900 dark:text-white'
                              }`}
                            >
                              {status}
                            </span>
                            {isDisabled && (
                              <span className="ml-auto text-xs text-brand-gray-400 dark:text-neutral-600">
                                Student only
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Role Switch Modal */}
      <RoleSwitchModal
        isOpen={showRoleSwitchModal}
        onClose={() => setShowRoleSwitchModal(false)}
        currentRole={userRole}
        targetRole={userRole === 'student' ? 'professional' : 'student'}
        message={`The status "${attemptedStatus}" is only available for ${userRole === 'student' ? 'Professionals' : 'Students'}. Switch your role to access this option.`}
        onConfirmSwitch={handleRoleSwitch}
        isLoading={isRoleSwitching}
      />
    </AnimatePresence>
  )
}

type AboutSectionProps = {
  aboutData: Record<string, unknown>
  isSelfProfile: boolean
  onSave: (data: Record<string, unknown>) => void
  className?: string
}
const AboutSection = ({
  aboutData,
  isSelfProfile,
  onSave,
  className = '',
}: AboutSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditModalOpen, setEditModalOpen] = useState(false)
  const summary_char_limit = 250
  const summary = (aboutData.professional_summary as string) || ''
  const isLongSummary = summary.length > summary_char_limit
  // Always show expand/collapse, but never make the section scrollable
  const displayedSummary =
    isExpanded || !isLongSummary
      ? summary
      : `${summary.substring(0, summary_char_limit)}...`

  return (
    <Section className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">
          About
        </h2>
        {isSelfProfile && (
          <Button
            variant="secondary"
            className="h-auto p-2.5"
            onClick={() => setEditModalOpen(true)}
          >
            <Edit3 size={20} />
          </Button>
        )}
      </div>
      <p className="text-brand-gray-600 leading-relaxed whitespace-pre-wrap dark:text-neutral-300 overflow-hidden min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {displayedSummary}
      </p>
      {isLongSummary && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400"
        >
          {isExpanded ? 'Show less' : 'Show more'}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
      <div className="border-brand-gray-200 mt-6 flex flex-col gap-6 border-t pt-6 sm:flex-row dark:border-neutral-800">
        <div className="flex flex-1 items-center gap-3 overflow-hidden min-w-0">
          <Briefcase
            size={20}
            className="text-brand-gray-400 dark:text-neutral-500 flex-shrink-0"
          />
          <div className="overflow-hidden min-w-0 flex-1">
            <h3 className="text-brand-gray-500 text-sm font-semibold tracking-wider uppercase dark:text-neutral-400">
              Profession
            </h3>
            <p className="text-brand-gray-900 mt-1 dark:text-white overflow-hidden min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {aboutData.industry as string}
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 overflow-hidden min-w-0">
          <BarChart3
            size={20}
            className="text-brand-gray-400 dark:text-neutral-500 flex-shrink-0"
          />
          <div className="overflow-hidden min-w-0 flex-1">
            <h3 className="text-brand-gray-500 text-sm font-semibold tracking-wider uppercase dark:text-neutral-400">
              Current Status
            </h3>
            <p className="text-brand-gray-900 mt-1 dark:text-white overflow-hidden min-w-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {aboutData.current_status as string}
            </p>
          </div>
        </div>
      </div>
      <EditAboutModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        aboutData={aboutData}
        onSave={onSave}
      />
    </Section>
  )
}

export default AboutSection
