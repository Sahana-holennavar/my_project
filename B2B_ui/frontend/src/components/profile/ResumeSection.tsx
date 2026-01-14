import React, { useState } from 'react'
import { FileText, Upload, Download, Trash2, Eye } from 'lucide-react'

// Types
type ResumeData = {
  file_id?: string
  file_name?: string
  file_url?: string
  uploaded_at?: string
}

type ResumeSectionProps = {
  resumeData: ResumeData
  isSelfProfile: boolean
  onSave: (data: ResumeData) => void
  onDelete: () => void
  className?: string
}

// UI Components
type ButtonProps = {
  className?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}

const Button = ({ className = '', children, variant = 'primary', disabled, ...props }: ButtonProps) => {
  const baseStyle = 'px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20',
    secondary: '!bg-white !text-neutral-800 dark:!bg-neutral-800 dark:!text-white hover:!bg-neutral-100 dark:hover:!bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition-colors',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20',
  }
  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled}
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

// Main Resume Section Component
const ResumeSection = ({ resumeData, isSelfProfile, onSave, onDelete, className = '' }: ResumeSectionProps) => {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const hasResume = resumeData.file_url && resumeData.file_name

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploading(true)

    // Simulate file upload (replace with actual upload logic)
    setTimeout(() => {
      const mockResumeData: ResumeData = {
        file_id: `file_${Date.now()}`,
        file_name: file.name,
        file_url: URL.createObjectURL(file), // In production, this would be the server URL
        uploaded_at: new Date().toISOString(),
      }
      onSave(mockResumeData)
      setUploading(false)
    }, 1500)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDownload = () => {
    if (resumeData.file_url) {
      window.open(resumeData.file_url, '_blank')
    }
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete your resume?')) {
      onDelete()
    }
  }

  return (
    <Section className={className}>
      <div className="mb-6">
        <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">Resume</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Upload your resume in PDF format (Max 5MB)
        </p>
      </div>

      {!hasResume ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">No resume uploaded yet.</p>
          {isSelfProfile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button onClick={handleUploadClick} disabled={uploading}>
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload Resume
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-start gap-4">
            {/* PDF Icon */}
            <div className="w-12 h-12 shrink-0 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <FileText className="text-red-600 dark:text-red-400" size={24} />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                {resumeData.file_name}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Uploaded {resumeData.uploaded_at ? new Date(resumeData.uploaded_at).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button variant="secondary" onClick={handleDownload}>
              <Download size={16} />
              Download
            </Button>
            <Button variant="secondary" onClick={handleDownload}>
              <Eye size={16} />
              View
            </Button>
            {isSelfProfile && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="secondary" onClick={handleUploadClick} disabled={uploading}>
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Replace
                    </>
                  )}
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  <Trash2 size={16} />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Section>
  )
}

export default ResumeSection
