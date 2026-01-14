import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Sparkles, Edit3, Trash2 } from 'lucide-react'
import { getProfile, updateSkillsSection, type Skill as APISkill } from '@/lib/api/profile'
import { useAppSelector } from '@/store/hooks'

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
type Skill = APISkill & { id: number }

type SkillsSectionProps = {
  skillsData: Skill[]
  isSelfProfile: boolean
  onSave: (data: Skill[]) => void
  onSkillsRefresh?: () => void | Promise<void>
  className?: string
}

type EditSkillModalProps = {
  isOpen: boolean
  onClose: () => void
  skillData: Skill | null
  onSave: (data: Skill) => void
  isLoading?: boolean
}

// UI Components
type ButtonProps = {
  className?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit'
  onClick?: () => void
}

const Button = ({ className = '', children, variant = 'primary', ...props }: ButtonProps) => {
  const baseStyle = 'px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-sm'
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20',
    secondary: '!bg-white !text-neutral-800 dark:!bg-neutral-800 dark:!text-white hover:!bg-neutral-100 dark:hover:!bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition-colors',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20',
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

type FormSelectProps = {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  error?: string
  children: React.ReactNode
}

const FormSelect = ({ label, name, value, onChange, error, children }: FormSelectProps) => (
  <div>
    <label className="text-sm text-neutral-600 dark:text-neutral-400">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
        error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
      } rounded-lg p-3 mt-1 text-neutral-900 dark:text-white appearance-none transition-colors`}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

// Edit/Add Skill Modal
const EditSkillModal = ({ isOpen, onClose, skillData, onSave, isLoading = false }: EditSkillModalProps) => {
  const [formData, setFormData] = useState<Skill>(
    skillData
      ? { ...skillData } // preserve id for edit
      : {
          id: Date.now(),
          skill_name: '',
          proficiency_level: 'Intermediate',
          years_of_experience: undefined,
        }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    if (skillData) {
      setFormData({ ...skillData }) // preserve id for edit
    } else {
      setFormData({
        id: Date.now(),
        skill_name: '',
        proficiency_level: 'Intermediate',
        years_of_experience: undefined,
      })
    }
    setErrors({})
  }, [skillData, isOpen])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    // Skill name validation
    if (!formData.skill_name || formData.skill_name.trim().length === 0) {
      newErrors.skill_name = 'Skill name is required.'
    } else if (formData.skill_name.trim().length < 2) {
      newErrors.skill_name = 'Skill name must be at least 2 characters.'
    } else if (formData.skill_name.trim().length > 50) {
      newErrors.skill_name = 'Skill name must not exceed 50 characters.'
    }
    
    // Years of experience validation
    if (formData.years_of_experience !== undefined && (formData.years_of_experience < 0 || formData.years_of_experience > 50)) {
      newErrors.years_of_experience = 'Years must be between 0 and 50.'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSave(formData)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'years_of_experience') {
      setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value) : undefined }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
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
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-xl"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{skillData ? 'Edit Skill' : 'Add Skill'}</h2>
                <button className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors" onClick={onClose} disabled={isLoading}>
                  <X size={22} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  label="Skill Name *"
                  name="skill_name"
                  value={formData.skill_name}
                  onChange={handleChange}
                  error={errors.skill_name}
                  placeholder="e.g., React, JavaScript, Python"
                />
                <FormSelect
                  label="Proficiency Level *"
                  name="proficiency_level"
                  value={formData.proficiency_level}
                  onChange={handleChange}
                >
                  {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  label="Years of Experience (Optional)"
                  name="years_of_experience"
                  value={formData.years_of_experience?.toString() || ''}
                  onChange={handleChange}
                  error={errors.years_of_experience}
                  placeholder="e.g., 3"
                  type="number"
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={onClose} aria-disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" aria-disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      skillData ? 'Save Changes' : 'Add Skill'
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

// Proficiency Badge Component
const ProficiencyBadge = ({ level }: { level: string }) => {
  const colors = {
    Beginner: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    Intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Advanced: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Expert: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colors[level as keyof typeof colors]}`}>
      {level}
    </span>
  )
}

// Main Skills Section Component
const SkillsSection = ({ skillsData, isSelfProfile, onSave, onSkillsRefresh, className = '' }: SkillsSectionProps) => {
  const [isEditModalOpen, setEditModalOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null)
  const user = useAppSelector((state) => state.auth.user)

  const handleAdd = () => {
    setEditingSkill(null)
    setEditModalOpen(true)
  }

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill)
    setEditModalOpen(true)
  }

  const handleSave = async (skillData: Skill) => {
    if (!user?.id) {
      setUploadError('User not authenticated')
      setTimeout(() => setUploadError(null), 5000)
      return
    }
    try {
      setIsLoading(true)
      setUploadError(null)
      setUploadSuccess(null)
      // Check if this is an edit or add operation
      const exists = skillsData.find((s) => s.id === skillData.id)
      let updatedSkillsData: Skill[]
      if (exists) {
        updatedSkillsData = skillsData.map((s) => (s.id === skillData.id ? skillData : s))
      } else {
        updatedSkillsData = [skillData, ...skillsData]
      }
       // Remove id field before sending to API and filter out empty objects (only once)
       const cleanSkillsArray: APISkill[] = updatedSkillsData
         .map(({ id, ...skill }) => skill as APISkill)
         .filter(s =>
           s &&
           typeof s.skill_name === 'string' && s.skill_name.trim().length > 0 &&
           typeof s.proficiency_level === 'string' && s.proficiency_level.trim().length > 0
         );
      await updateSkillsSection(
        user.id,
        cleanSkillsArray
      )
      if (onSkillsRefresh) {
        await onSkillsRefresh()
      } else {
        const profile = await getProfile(user.id)
        if (profile && profile.success && profile.data && profile.data.skills) {
          const filteredSkills = profile.data.skills.filter(s => s && Object.keys(s).length > 0)
          if (typeof onSave === 'function') {
            onSave(filteredSkills.map((s, idx) => ({ ...s, id: Date.now() + idx })))
          }
        }
      }
      setUploadSuccess(exists ? 'Skill updated successfully!' : 'Skill added successfully!')
      setEditModalOpen(false)
      setTimeout(() => setUploadSuccess(null), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update skill'
      setUploadError(errorMsg)
      setTimeout(() => setUploadError(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (skill: Skill) => {
    setDeletingSkill(skill)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!user?.id || !deletingSkill) return
    setIsLoading(true)
    setUploadError(null)
    setUploadSuccess(null)
    try {
      const updatedSkillsData = skillsData.filter((s) => s.id !== deletingSkill.id)
      // Filter out all empty objects before sending to backend
      const cleanSkillsArray: APISkill[] = updatedSkillsData
        .map(({ id, ...skill }) => skill as APISkill)
        .filter(s =>
          s &&
          typeof s.skill_name === 'string' && s.skill_name.trim().length > 0 &&
          typeof s.proficiency_level === 'string' && s.proficiency_level.trim().length > 0
        );
      await updateSkillsSection(
        user.id,
        cleanSkillsArray
      )
      if (onSkillsRefresh) {
        await onSkillsRefresh()
      } else {
        const profile = await getProfile(user.id)
        if (profile && profile.success && profile.data && profile.data.skills) {
          const filteredSkills = profile.data.skills.filter(s => s && Object.keys(s).length > 0)
          if (typeof onSave === 'function') {
            onSave(filteredSkills.map((s, idx) => ({ ...s, id: Date.now() + idx })))
          }
        }
      }
      setUploadSuccess('Skill deleted successfully!')
      setDeleteConfirmOpen(false)
      setDeletingSkill(null)
      setTimeout(() => setUploadSuccess(null), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete skill'
      setUploadError(errorMsg)
      setTimeout(() => setUploadError(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Section className={className}>
      <AnimatePresence>
        {(uploadSuccess || uploadError || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[60] max-w-md"
          >
            {isLoading && (
              <div className="bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span className="font-medium">Saving skill...</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{uploadSuccess}</span>
              </div>
            )}
            {uploadError && (
              <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">Failed to save skill</p>
                  <p className="text-sm mt-1 opacity-90">{uploadError}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">Skills</h2>
        {isSelfProfile && (
          <Button variant="secondary" className="h-auto p-2.5" onClick={handleAdd}>
            <Plus size={20} />
          </Button>
        )}
      </div>
      {skillsData.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">No skills added yet.</p>
          {isSelfProfile && (
            <Button className="mt-4" onClick={handleAdd}>
              <Plus size={18} />
              Add Skill
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {skillsData.map((skill) => (
              <div
                key={skill.id}
                className="group relative flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full px-4 py-2 transition-colors hover:border-purple-400 dark:hover:border-purple-500"
              >
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {skill.skill_name}
                </span>
                <ProficiencyBadge level={skill.proficiency_level} />
                {skill.years_of_experience !== undefined && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    • {skill.years_of_experience}y
                  </span>
                )}
                {isSelfProfile && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(skill)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(skill)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {deleteConfirmOpen && (
              <motion.div
                variants={modalBackdropVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => !isLoading && setDeleteConfirmOpen(false)}
              >
                <motion.div
                  variants={modalContentVariants}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-xl"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Delete Skill</h2>
                      <button
                        className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                        onClick={() => !isLoading && setDeleteConfirmOpen(false)}
                        aria-disabled={isLoading}
                      >
                        <X size={22} />
                      </button>
                    </div>
                    <p className="mb-6 text-neutral-700 dark:text-neutral-300">Are you sure you want to delete <span className="font-semibold">{deletingSkill?.skill_name}</span>? This action cannot be undone.</p>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={() => setDeleteConfirmOpen(false)} aria-disabled={isLoading}>Cancel</Button>
                      <Button type="button" variant="primary" onClick={handleDeleteConfirm} aria-disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <EditSkillModal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!isLoading) setEditModalOpen(false)
        }}
        skillData={editingSkill}
        onSave={handleSave}
        isLoading={isLoading}
      />
    </Section>
  )
}

export default SkillsSection
