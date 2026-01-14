import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, Plus, X, Award, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { updateAwardsSection } from '@/lib/api/profile'
import { fetchProfile } from '@/store/slices/profileSlice'
import { toast } from 'sonner'

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
type AwardType = {
  id: number
  award_name: string
  issuing_organization: string
  date_received: string // MM/YYYY
  description: string
  certificate_url?: string
}

type AwardsSectionProps = {
  awardsData: AwardType[]
  isSelfProfile: boolean
  onSave?: (data: AwardType[]) => void
  className?: string
}

type EditAwardModalProps = {
  isOpen: boolean
  onClose: () => void
  awardData: AwardType | null
  awardsData: AwardType[]
  onSuccess?: () => void
}

// UI Components
type ButtonProps = {
  className?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
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
  type?: string
}

const FormInput = ({ label, name, value, onChange, error, ...props }: FormInputProps) => (
  <div>
    <label className="text-sm text-neutral-600 dark:text-neutral-400">{label}</label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      {...props}
      className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
        error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
      } rounded-lg p-3 mt-1 text-neutral-900 dark:text-white transition-colors`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

type FormTextareaProps = {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  error?: string
  maxLength: number
}

const FormTextarea = ({ label, name, value, onChange, error, maxLength }: FormTextareaProps) => (
  <div>
    <label className="text-sm text-neutral-600 dark:text-neutral-400">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={4}
      maxLength={maxLength}
      className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
        error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
      } rounded-lg p-3 mt-1 text-neutral-900 dark:text-white transition-colors resize-vertical`}
    />
    <div className="flex justify-between">
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className={`text-xs mt-1 ml-auto ${value.length > maxLength ? 'text-red-500' : 'text-neutral-500'}`}>
        {value.length} / {maxLength}
      </p>
    </div>
  </div>
)

// Edit Award Modal
const EditAwardModal = ({ isOpen, onClose, awardData, awardsData, onSuccess }: EditAwardModalProps) => {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const [formData, setFormData] = useState<AwardType>(
    awardData || {
      id: Date.now(),
      award_name: '',
      issuing_organization: '',
      date_received: '',
      description: '',
      certificate_url: '',
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  React.useEffect(() => {
    if (awardData) {
      setFormData(awardData)
    } else {
      setFormData({
        id: Date.now(),
        award_name: '',
        issuing_organization: '',
        date_received: '',
        description: '',
        certificate_url: '',
      })
    }
  }, [awardData, isOpen])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    // Award Name
    if (formData.award_name.length < 5 || formData.award_name.length > 100) {
      newErrors.award_name = 'Award name must be 5-100 characters.'
    }

    // Issuing Organization
    if (formData.issuing_organization.length < 2 || formData.issuing_organization.length > 100) {
      newErrors.issuing_organization = 'Organization name must be 2-100 characters.'
    }

    // Date
    const [month, year] = formData.date_received.split('/').map(Number)
    const date = new Date(year, month - 1)
    if (!month || !year || isNaN(date.getTime())) {
      newErrors.date_received = 'Date is required (MM/YYYY).'
    } else if (date > new Date()) {
      newErrors.date_received = 'Date cannot be in the future.'
    }

    // Description
    if (formData.description.length < 50 || formData.description.length > 500) {
      newErrors.description = 'Description must be 50-500 characters.'
    }

    // URL (optional)
    if (formData.certificate_url && !/^https?:\/\/.+/.test(formData.certificate_url)) {
      newErrors.certificate_url = 'Must be a valid URL (https://...)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the validation errors')
      return
    }
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    setIsSubmitting(true)
    try {
      // Check if editing existing or adding new
      const exists = awardsData.find((a) => a.id === formData.id)
      let updatedAwards: AwardType[]
      
      if (exists) {
        // Update existing award
        updatedAwards = awardsData.map((a) => (a.id === formData.id ? formData : a))
      } else {
        // Add new award
        updatedAwards = [...awardsData, formData]
      }

      await updateAwardsSection(user.id, updatedAwards)
      
      // Refresh profile to get updated data
      await dispatch(fetchProfile(user.id))
      
      toast.success(exists ? 'Award updated successfully!' : 'Award added successfully!')
      
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save award'
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {awardData ? 'Edit Award' : 'Add Award'}
                </h2>
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
                  label="Award Name *"
                  name="award_name"
                  value={formData.award_name}
                  onChange={handleChange}
                  error={errors.award_name}
                  placeholder="e.g., Employee of the Year"
                />

                <FormInput
                  label="Issuing Organization *"
                  name="issuing_organization"
                  value={formData.issuing_organization}
                  onChange={handleChange}
                  error={errors.issuing_organization}
                  placeholder="e.g., TechCorp Inc."
                />

                <FormInput
                  label="Date Received (MM/YYYY) *"
                  name="date_received"
                  value={formData.date_received}
                  onChange={handleChange}
                  error={errors.date_received}
                  placeholder="e.g., 06/2023"
                />

                <FormTextarea
                  label="Description *"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  error={errors.description}
                  maxLength={500}
                />

                <FormInput
                  label="Certificate URL (Optional)"
                  name="certificate_url"
                  value={formData.certificate_url || ''}
                  onChange={handleChange}
                  error={errors.certificate_url}
                  placeholder="https://..."
                  type="url"
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Award Card Component with Show More/Less
const AwardCard = ({ 
  award, 
  isSelfProfile, 
  onEdit, 
  onDelete, 
  isDeleting 
}: { 
  award: AwardType; 
  isSelfProfile: boolean; 
  onEdit: () => void; 
  onDelete: () => void; 
  isDeleting: boolean;
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const descriptionLimit = 200

  const shouldTruncate = award.description && award.description.length > descriptionLimit
  const displayedDescription = shouldTruncate && !showFullDescription
    ? `${award.description.slice(0, descriptionLimit)}...`
    : award.description

  return (
    <div className="flex gap-4 relative group overflow-hidden min-w-0">
      {/* Award Icon */}
      <div className="w-12 h-12 shrink-0 mt-1 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
        <Award className="text-amber-600 dark:text-amber-400" size={24} />
      </div>

      {/* Award Details */}
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="overflow-hidden min-w-0 flex-1">
            <h3 
              className="font-semibold text-neutral-900 dark:text-white text-lg overflow-hidden min-w-0"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {award.award_name}
            </h3>
            <p 
              className="text-neutral-700 dark:text-neutral-300 overflow-hidden min-w-0"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {award.issuing_organization}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{award.date_received}</p>
          </div>
        </div>
        {award.description && (
          <div className="mt-3 overflow-hidden min-w-0">
            <p 
              className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed overflow-hidden min-w-0"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {displayedDescription}
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-purple-600 dark:text-purple-400 text-sm font-medium mt-2 hover:underline"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
        {award.certificate_url && (
          <a
            href={award.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
          >
            <ExternalLink size={16} />
            View Certificate
          </a>
        )}
      </div>

      {/* Edit and Delete Buttons (Only for Self Profile) */}
      {isSelfProfile && (
        <div className="absolute top-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
            title="Edit Award"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
            title="Delete Award"
          >
            {isDeleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// Main Awards Section Component
const AwardsSection = ({ awardsData, isSelfProfile, onSave, className = '' }: AwardsSectionProps) => {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const [isEditModalOpen, setEditModalOpen] = useState(false)
  const [editingAward, setEditingAward] = useState<AwardType | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleAdd = () => {
    setEditingAward(null)
    setEditModalOpen(true)
  }

  const handleEdit = (award: AwardType) => {
    setEditingAward(award)
    setEditModalOpen(true)
  }

  const handleDelete = async (awardId: number) => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }
    
    if (!confirm('Are you sure you want to delete this award?')) {
      return
    }

    setDeletingId(awardId)
    try {
      const updatedAwards = awardsData.filter((a) => a.id !== awardId)
      await updateAwardsSection(user.id, updatedAwards)
      
      // Refresh profile to get updated data
      await dispatch(fetchProfile(user.id))
      
      toast.success('Award deleted successfully!')
      
      if (onSave) {
        onSave(updatedAwards)
      }
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete award'
      toast.error(errorMsg)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1)
    if (onSave) {
      // Trigger parent refresh if callback provided
      onSave(awardsData)
    }
  }

  return (
    <Section className={className}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">Awards</h2>
        {isSelfProfile && (
          <Button variant="secondary" className="h-auto p-2.5" onClick={handleAdd}>
            <Plus size={20} />
          </Button>
        )}
      </div>

      {awardsData.length === 0 ? (
        <div className="text-center py-12">
          <Award className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">No awards added yet.</p>
          {isSelfProfile && (
            <Button className="mt-4" onClick={handleAdd}>
              <Plus size={18} />
              Add Award
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {awardsData.map((award) => (
            <AwardCard
              key={award.id}
              award={award}
              isSelfProfile={isSelfProfile}
              onEdit={() => handleEdit(award)}
              onDelete={() => handleDelete(award.id)}
              isDeleting={deletingId === award.id}
            />
          ))}
        </div>
      )}

      <EditAwardModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        awardData={editingAward}
        awardsData={awardsData}
        onSuccess={handleSuccess}
      />
    </Section>
  )
}

export default AwardsSection
