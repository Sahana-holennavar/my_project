import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, X, Link as LinkIcon, Linkedin, Github, Twitter, Globe, ExternalLink } from 'lucide-react'

// Animation variants
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

// Types
type SocialLinks = {
  linkedin_url?: string
  github_url?: string
  twitter_url?: string
  personal_website_url?: string
  portfolio_url?: string
  other_url?: string
}

type SocialLinksSectionProps = {
  socialLinksData: SocialLinks
  isSelfProfile: boolean
  onSave: (data: SocialLinks) => void
  className?: string
}

type EditSocialLinksModalProps = {
  isOpen: boolean
  onClose: () => void
  socialLinksData: SocialLinks
  onSave: (data: SocialLinks) => void
}

// UI Components
type ButtonProps = {
  className?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  onClick?: () => void
}

const Button = ({ className = '', children, variant = 'primary', ...props }: ButtonProps) => {
  const baseStyle = 'px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-sm'
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20',
    secondary: '!bg-white !text-neutral-800 dark:!bg-neutral-800 dark:!text-white hover:!bg-neutral-100 dark:hover:!bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition-colors',
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
  <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-lg transition-colors ${className}`}>
    {children}
  </div>
)

// Form Components
type FormInputProps = {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  placeholder?: string
  icon?: React.ReactNode
}

const FormInput = ({ label, name, value, onChange, error, icon, ...props }: FormInputProps) => (
  <div>
    <label className="text-sm text-neutral-600 dark:text-neutral-400">{label}</label>
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
          {icon}
        </div>
      )}
      <input
        name={name}
        value={value}
        onChange={onChange}
        {...props}
        className={`w-full ${icon ? 'pl-10' : ''} bg-neutral-100 dark:bg-neutral-800 border ${
          error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
        } rounded-lg p-3 mt-1 text-neutral-900 dark:text-white transition-colors`}
      />
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

// Edit Social Links Modal
const EditSocialLinksModal = ({ isOpen, onClose, socialLinksData, onSave }: EditSocialLinksModalProps) => {
  const [formData, setFormData] = useState<SocialLinks>(socialLinksData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    setFormData(socialLinksData)
  }, [socialLinksData, isOpen])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    const urlPattern = /^https?:\/\/.+/

    // Validate each URL if provided
    if (formData.linkedin_url && !urlPattern.test(formData.linkedin_url)) {
      newErrors.linkedin_url = 'Must be a valid URL (https://...)'
    }
    if (formData.github_url && !urlPattern.test(formData.github_url)) {
      newErrors.github_url = 'Must be a valid URL (https://...)'
    }
    if (formData.twitter_url && !urlPattern.test(formData.twitter_url)) {
      newErrors.twitter_url = 'Must be a valid URL (https://...)'
    }
    if (formData.personal_website_url && !urlPattern.test(formData.personal_website_url)) {
      newErrors.personal_website_url = 'Must be a valid URL (https://...)'
    }
    if (formData.portfolio_url && !urlPattern.test(formData.portfolio_url)) {
      newErrors.portfolio_url = 'Must be a valid URL (https://...)'
    }
    if (formData.other_url && !urlPattern.test(formData.other_url)) {
      newErrors.other_url = 'Must be a valid URL (https://...)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSave(formData)
      onClose()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value || undefined }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            variants={modalContentVariants}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-xl"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Edit Social Links</h2>
                <button className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors" onClick={onClose}>
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <style jsx>{`
                  .scrollbar-hide {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                  }
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>

                <FormInput
                  label="LinkedIn Profile"
                  name="linkedin_url"
                  value={formData.linkedin_url || ''}
                  onChange={handleChange}
                  error={errors.linkedin_url}
                  placeholder="https://linkedin.com/in/username"
                  icon={<Linkedin size={18} />}
                />

                <FormInput
                  label="GitHub Profile"
                  name="github_url"
                  value={formData.github_url || ''}
                  onChange={handleChange}
                  error={errors.github_url}
                  placeholder="https://github.com/username"
                  icon={<Github size={18} />}
                />

                <FormInput
                  label="Twitter Profile"
                  name="twitter_url"
                  value={formData.twitter_url || ''}
                  onChange={handleChange}
                  error={errors.twitter_url}
                  placeholder="https://twitter.com/username"
                  icon={<Twitter size={18} />}
                />

                <FormInput
                  label="Personal Website"
                  name="personal_website_url"
                  value={formData.personal_website_url || ''}
                  onChange={handleChange}
                  error={errors.personal_website_url}
                  placeholder="https://yourwebsite.com"
                  icon={<Globe size={18} />}
                />

                <FormInput
                  label="Portfolio URL"
                  name="portfolio_url"
                  value={formData.portfolio_url || ''}
                  onChange={handleChange}
                  error={errors.portfolio_url}
                  placeholder="https://portfolio.com"
                  icon={<LinkIcon size={18} />}
                />

                <FormInput
                  label="Other Link"
                  name="other_url"
                  value={formData.other_url || ''}
                  onChange={handleChange}
                  error={errors.other_url}
                  placeholder="https://..."
                  icon={<ExternalLink size={18} />}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Social Link Display Component
const SocialLinkItem = ({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors group"
  >
    <div className="text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-neutral-900 dark:text-white">{label}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{url}</p>
    </div>
    <ExternalLink size={16} className="text-neutral-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
  </a>
)

// Main Social Links Section Component
const SocialLinksSection = ({ socialLinksData, isSelfProfile, onSave, className = '' }: SocialLinksSectionProps) => {
  const [isEditModalOpen, setEditModalOpen] = useState(false)

  const hasAnyLinks = Object.values(socialLinksData).some((link) => link)

  const socialLinks = [
    { key: 'linkedin_url', icon: <Linkedin size={20} />, label: 'LinkedIn', url: socialLinksData.linkedin_url },
    { key: 'github_url', icon: <Github size={20} />, label: 'GitHub', url: socialLinksData.github_url },
    { key: 'twitter_url', icon: <Twitter size={20} />, label: 'Twitter', url: socialLinksData.twitter_url },
    { key: 'personal_website_url', icon: <Globe size={20} />, label: 'Personal Website', url: socialLinksData.personal_website_url },
    { key: 'portfolio_url', icon: <LinkIcon size={20} />, label: 'Portfolio', url: socialLinksData.portfolio_url },
    { key: 'other_url', icon: <ExternalLink size={20} />, label: 'Other Link', url: socialLinksData.other_url },
  ]

  return (
    <Section className={className}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">Social Links</h2>
        {isSelfProfile && (
          <Button variant="secondary" className="h-auto p-2.5" onClick={() => setEditModalOpen(true)}>
            <Edit3 size={20} />
          </Button>
        )}
      </div>

      {!hasAnyLinks ? (
        <div className="text-center py-12">
          <LinkIcon className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">No social links added yet.</p>
          {isSelfProfile && (
            <Button className="mt-4" onClick={() => setEditModalOpen(true)}>
              <LinkIcon size={18} />
              Add Social Links
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialLinks.map(
            (link) =>
              link.url && (
                <SocialLinkItem
                  key={link.key}
                  icon={link.icon}
                  label={link.label}
                  url={link.url}
                />
              )
          )}
        </div>
      )}

      <EditSocialLinksModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        socialLinksData={socialLinksData}
        onSave={onSave}
      />
    </Section>
  )
}

export default SocialLinksSection
