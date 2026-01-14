import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, Plus, X, Briefcase, Trash2, ExternalLink, Github, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import type { Project } from '@/lib/api/profile'

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

type ProjectsSectionProps = {
  projectsData: Project[]
  isSelfProfile: boolean
  onSave: (data: Project[]) => void
  onProjectsRefresh?: () => void | Promise<void>
  className?: string
}

type EditProjectModalProps = {
  isOpen: boolean
  onClose: () => void
  projectData: Project | null
  onSave: (data: Project) => void
  isLoading?: boolean
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
  placeholder?: string
  rows?: number
}

const FormTextarea = ({ label, name, value, onChange, error, rows = 4, ...props }: FormTextareaProps) => (
  <div>
    <label className="text-sm text-neutral-600 dark:text-neutral-400">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      {...props}
      className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
        error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
      } rounded-lg p-3 mt-1 text-neutral-900 dark:text-white transition-colors resize-none`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

// Edit Project Modal
const EditProjectModal = ({ isOpen, onClose, projectData, onSave, isLoading = false }: EditProjectModalProps) => {
  const [formData, setFormData] = useState<Project>(
    projectData || {
      id: Date.now(),
      project_title: '',
      description: '',
      technologies: [],
      start_date: '',
      end_date: '',
      project_url: '',
      github_url: '',
      demo_url: '',
      role: '',
      team_size: undefined,
      currently_working: false,
    }
  )
  const [techInput, setTechInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    if (projectData) {
      setFormData(projectData)
    } else {
      setFormData({
        id: Date.now(),
        project_title: '',
        description: '',
        technologies: [],
        start_date: '',
        end_date: '',
        project_url: '',
        github_url: '',
        demo_url: '',
        role: '',
        team_size: undefined,
        currently_working: false,
      })
    }
  }, [projectData, isOpen])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    // Project title - required, 2-100 chars
    if (formData.project_title.length < 2 || formData.project_title.length > 100) {
      newErrors.project_title = 'Project title must be 2-100 characters.'
    }

    // Description - required, 100-2000 chars
    if (!formData.description || formData.description.length < 100 || formData.description.length > 2000) {
      newErrors.description = 'Description must be 100-2000 characters.'
    }

    // Technologies - optional, max 10 items, each 2-30 chars
    if (formData.technologies && formData.technologies.length > 10) {
      newErrors.technologies = 'Maximum 10 technologies allowed.'
    }

    // Date format validation (MM/YYYY)
    const dateRegex = /^(0[1-9]|1[0-2])\/\d{4}$/
    if (formData.start_date && !dateRegex.test(formData.start_date)) {
      newErrors.start_date = 'Start date must be in MM/YYYY format.'
    }
    if (formData.end_date && !dateRegex.test(formData.end_date)) {
      newErrors.end_date = 'End date must be in MM/YYYY format.'
    }

    // URL validations
    const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/
    if (formData.project_url && !urlRegex.test(formData.project_url)) {
      newErrors.project_url = 'Project URL must be valid.'
    }
    if (formData.github_url && (!urlRegex.test(formData.github_url) || !formData.github_url.includes('github.com'))) {
      newErrors.github_url = 'GitHub URL must be valid and from github.com.'
    }
    if (formData.demo_url && !urlRegex.test(formData.demo_url)) {
      newErrors.demo_url = 'Demo URL must be valid.'
    }

    // Role - optional, max 50 chars
    if (formData.role && formData.role.length > 50) {
      newErrors.role = 'Role must be less than 50 characters.'
    }

    // Team size - optional, 1-50
    if (formData.team_size && (formData.team_size < 1 || formData.team_size > 50)) {
      newErrors.team_size = 'Team size must be between 1 and 50.'
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    if (name === 'team_size') {
      setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value) : undefined }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }
  }

  const handleAddTech = () => {
    if (techInput.trim() && techInput.length >= 2 && techInput.length <= 30) {
      if ((formData.technologies?.length || 0) < 10) {
        setFormData((prev) => ({
          ...prev,
          technologies: [...(prev.technologies || []), techInput.trim()],
        }))
        setTechInput('')
      }
    }
  }

  const handleRemoveTech = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      technologies: prev.technologies?.filter((_, i) => i !== index) || [],
    }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={(e) => {
            if (!isLoading) {
              onClose()
            }
          }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            variants={modalContentVariants}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            <style jsx>{`
              .scrollbar-hide {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE 10+ */
              }
              .scrollbar-hide::-webkit-scrollbar {
                display: none; /* Chrome/Safari/Webkit */
              }
            `}</style>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {projectData ? 'Edit Project' : 'Add Project'}
                </h2>
                <button 
                  className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={() => {
                    if (!isLoading) {
                      onClose()
                    }
                  }}
                  disabled={isLoading}
                >
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <FormInput
                  label="Project Title *"
                  name="project_title"
                  value={formData.project_title}
                  onChange={handleChange}
                  error={errors.project_title}
                  placeholder="e.g., E-commerce Platform"
                />

                <FormTextarea
                  label="Description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  error={errors.description}
                  placeholder="Brief description of the project..."
                  rows={4}
                />

                {/* Technologies */}
                <div>
                  <label className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 block">Technologies (Max 10)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTech()
                        }
                      }}
                      placeholder="Add technology..."
                      className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddTech}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      disabled={(formData.technologies?.length || 0) >= 10}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.technologies?.map((tech, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {tech}
                        <button
                          type="button"
                          onClick={() => handleRemoveTech(index)}
                          className="hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {errors.technologies && <p className="text-xs text-red-500 mt-1">{errors.technologies}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Start Date (MM/YYYY)"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleChange}
                    error={errors.start_date}
                    placeholder="01/2024"
                  />

                  {!formData.currently_working && (
                    <FormInput
                      label="End Date (MM/YYYY)"
                      name="end_date"
                      value={formData.end_date || ''}
                      onChange={handleChange}
                      error={errors.end_date}
                      placeholder="05/2024"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="currently_working"
                    name="currently_working"
                    checked={formData.currently_working}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
                  />
                  <label htmlFor="currently_working" className="text-sm text-neutral-600 dark:text-neutral-400">
                    Currently working on this project
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Role"
                    name="role"
                    value={formData.role || ''}
                    onChange={handleChange}
                    error={errors.role}
                    placeholder="e.g., Full Stack Developer"
                  />

                  <FormInput
                    label="Team Size"
                    name="team_size"
                    type="number"
                    value={formData.team_size?.toString() || ''}
                    onChange={handleChange}
                    error={errors.team_size}
                    placeholder="e.g., 5"
                  />
                </div>

                <FormInput
                  label="Project URL"
                  name="project_url"
                  value={formData.project_url || ''}
                  onChange={handleChange}
                  error={errors.project_url}
                  placeholder="https://project.com"
                />

                <FormInput
                  label="GitHub URL"
                  name="github_url"
                  value={formData.github_url || ''}
                  onChange={handleChange}
                  error={errors.github_url}
                  placeholder="https://github.com/user/repo"
                />

                <FormInput
                  label="Demo URL"
                  name="demo_url"
                  value={formData.demo_url || ''}
                  onChange={handleChange}
                  error={errors.demo_url}
                  placeholder="https://demo.project.com"
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

// Project Card Component with expandable description
const ProjectCard = ({ 
  project, 
  isSelfProfile, 
  onEdit, 
  onDelete 
}: { 
  project: Project
  isSelfProfile: boolean
  onEdit: () => void
  onDelete: () => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const descriptionLimit = 200 // Characters to show before "Show more"
  const shouldShowToggle = project.description && project.description.length > descriptionLimit

  return (
    <div className="relative group border-b border-neutral-200 dark:border-neutral-800 pb-6 last:border-0 overflow-hidden">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0 overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          <h3 className="font-semibold text-neutral-900 dark:text-white text-lg" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {project.project_title}
          </h3>
          {project.role && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {project.role}
            </p>
          )}
          {project.description && (
            <div className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 overflow-hidden">
              <p className="whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {shouldShowToggle && !isExpanded 
                  ? `${project.description.slice(0, descriptionLimit)}...` 
                  : project.description
                }
              </p>
              {shouldShowToggle && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium mt-2 flex items-center gap-1 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      Show less <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          
          {project.technologies && project.technologies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {project.technologies.map((tech, idx) => (
                <span
                  key={idx}
                  className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs break-all max-w-full"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            {project.start_date && (
              <span className="break-words">
                {project.start_date} - {project.currently_working ? 'Present' : project.end_date || 'N/A'}
              </span>
            )}
            {project.team_size && <span>• Team: {project.team_size}</span>}
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm flex items-center gap-1 max-w-full overflow-hidden"
              >
                <ExternalLink size={14} className="flex-shrink-0" />
                <span className="truncate">Project</span>
              </a>
            )}
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm flex items-center gap-1 max-w-full overflow-hidden"
              >
                <Github size={14} className="flex-shrink-0" />
                <span className="truncate">GitHub</span>
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm flex items-center gap-1 max-w-full overflow-hidden"
              >
                <ExternalLink size={14} className="flex-shrink-0" />
                <span className="truncate">Demo</span>
              </a>
            )}
          </div>
        </div>

        {/* Edit & Delete Buttons */}
        {isSelfProfile && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Main Projects Section Component
const ProjectsSection = ({ projectsData, isSelfProfile, onSave, onProjectsRefresh, className = '' }: ProjectsSectionProps) => {
  const [isEditModalOpen, setEditModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  
  const user = useAppSelector((state) => state.auth.user)

  const handleDeleteClick = (project: Project) => {
    setDeletingProject(project)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!user?.id || !deletingProject) return
    setIsLoading(true)
    setUploadError(null)
    setUploadSuccess(null)
    try {
      const updatedProjectsData = projectsData.filter((p) => p.id !== deletingProject.id)
      // Call backend API to update projects (replace entire section)
      const { updateProjectsSection } = await import('@/lib/api/profile')
      await updateProjectsSection(user.id, updatedProjectsData)
      setUploadSuccess('Project deleted successfully!')
      setDeleteConfirmOpen(false)
      setDeletingProject(null)
      if (onProjectsRefresh) {
        await onProjectsRefresh()
      } else {
        onSave(updatedProjectsData)
      }
      setTimeout(() => setUploadSuccess(null), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete project'
      setUploadError(errorMsg)
      setTimeout(() => setUploadError(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingProject(null)
    setEditModalOpen(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setEditModalOpen(true)
  }

  const handleSave = async (projectData: Project) => {
    if (!user?.id) {
      setUploadError('User not authenticated')
      setTimeout(() => setUploadError(null), 5000)
      return
    }

    try {
      setIsLoading(true)
      setUploadError(null)
      setUploadSuccess(null)

      const exists = projectsData.find((p) => p.id === projectData.id)
      let updatedProjectsData: Project[]

      if (exists) {
        updatedProjectsData = projectsData.map((p) => (p.id === projectData.id ? projectData : p))
      } else {
        updatedProjectsData = [projectData, ...projectsData]
      }

      // Call backend API to update projects (replace entire section)
      const { updateProjectsSection } = await import('@/lib/api/profile')
      await updateProjectsSection(user.id, updatedProjectsData)

      setUploadSuccess(exists ? 'Project updated successfully!' : 'Project added successfully!')
      setEditModalOpen(false)

      if (onProjectsRefresh) {
        await onProjectsRefresh()
      } else {
        onSave(updatedProjectsData)
      }

      setTimeout(() => setUploadSuccess(null), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update project'
      setUploadError(errorMsg)
      setTimeout(() => setUploadError(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Upload Status Notifications */}
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
                <span className="font-medium">Saving project...</span>
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
                  <p className="font-medium">Failed to save project</p>
                  <p className="text-sm mt-1 opacity-90">{uploadError}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Section className={`mt-6 ${className}`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">Projects</h2>
          {isSelfProfile && (
            <Button variant="secondary" className="h-auto p-2.5" onClick={handleAdd}>
              <Plus size={20} />
            </Button>
          )}
        </div>

        {projectsData.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600 mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400">No projects added yet.</p>
            {isSelfProfile && (
              <Button className="mt-4" onClick={handleAdd}>
                <Plus size={18} />
                Add Project
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {projectsData.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelfProfile={isSelfProfile}
                onEdit={() => handleEdit(project)}
                onDelete={() => handleDeleteClick(project)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Edit/Add Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        projectData={editingProject}
        onSave={handleSave}
        isLoading={isLoading}
      />

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
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-xl p-6"
            >
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Delete Project</h3>
              <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                Are you sure you want to delete &quot;{deletingProject?.project_title}&quot;? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ProjectsSection
