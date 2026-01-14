import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, Plus, X, Shield, ExternalLink, Loader2, Trash2, Download, Eye } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { updateCertificationsSection, uploadProfileImage } from '@/lib/api/profile'
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
type Certification = {
  id: number
  certification_name: string
  issuing_authority: string
  license_number?: string
  issue_date: string // MM/YYYY
  expiration_date?: string // MM/YYYY
  verification_url?: string
  never_expires: boolean
  certificate_url?: string // Certificate file URL (JPG, PNG, or PDF)
}

// Extended type for certificate with potential alternative field names
type CertificationWithUrls = Certification & {
  certificateUrl?: string
  certificate_file_url?: string
}

type CertificationsSectionProps = {
  certificationsData: Certification[]
  isSelfProfile: boolean
  onSave?: (data: Certification[]) => void
  className?: string
}

type EditCertificationModalProps = {
  isOpen: boolean
  onClose: () => void
  certificationData: Certification | null
  certificationsData: Certification[]
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

// Edit Certification Modal
const EditCertificationModal = ({ isOpen, onClose, certificationData, certificationsData, onSuccess }: EditCertificationModalProps) => {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const [formData, setFormData] = useState<Certification>(
    certificationData || {
      id: Date.now(),
      certification_name: '',
      issuing_authority: '',
      license_number: '',
      issue_date: '',
      expiration_date: '',
      verification_url: '',
      never_expires: false,
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [certificatePreview, setCertificatePreview] = useState<string | null>(null)
  const [certificateFileName, setCertificateFileName] = useState<string>('')
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false)
  const [certificateError, setCertificateError] = useState<string | null>(null)

  React.useEffect(() => {
    if (certificationData) {
      setFormData(certificationData)
      // Load certificate preview if URL exists
      if (certificationData.certificate_url) {
        setCertificatePreview(certificationData.certificate_url)
        setCertificateFileName(certificationData.certificate_url.split('/').pop() || '')
      }
    } else {
      setFormData({
        id: Date.now(),
        certification_name: '',
        issuing_authority: '',
        license_number: '',
        issue_date: '',
        expiration_date: '',
        verification_url: '',
        never_expires: false,
      })
      setCertificatePreview(null)
      setCertificateFileName('')
      setCertificateFile(null)
    }
    setCertificateError(null)
  }, [certificationData, isOpen])
  
  // Clean up preview URL when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (certificatePreview && certificatePreview.startsWith('blob:')) {
        URL.revokeObjectURL(certificatePreview)
      }
    }
  }, [certificatePreview])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    // Certification Name
    if (formData.certification_name.length < 5 || formData.certification_name.length > 100) {
      newErrors.certification_name = 'Certification name must be 5-100 characters.'
    }

    // Issuing Authority
    if (formData.issuing_authority.length < 2 || formData.issuing_authority.length > 100) {
      newErrors.issuing_authority = 'Issuing authority must be 2-100 characters.'
    }

    // Issue Date
    const [issueMonth, issueYear] = formData.issue_date.split('/').map(Number)
    const issueDate = new Date(issueYear, issueMonth - 1)
    if (!issueMonth || !issueYear || isNaN(issueDate.getTime())) {
      newErrors.issue_date = 'Issue date is required (MM/YYYY).'
    } else if (issueDate > new Date()) {
      newErrors.issue_date = 'Issue date cannot be in the future.'
    }

    // Expiration Date (if not never expires)
    if (!formData.never_expires) {
      const [expMonth, expYear] = (formData.expiration_date || '').split('/').map(Number)
      const expDate = new Date(expYear, expMonth - 1)
      if (!expMonth || !expYear || isNaN(expDate.getTime())) {
        newErrors.expiration_date = 'Expiration date is required.'
      } else if (issueDate >= expDate) {
        newErrors.expiration_date = 'Expiration date must be after issue date.'
      }
    }

    // URL (optional)
    if (formData.verification_url && !/^https?:\/\/.+/.test(formData.verification_url)) {
      newErrors.verification_url = 'Must be a valid URL (https://...)'
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
    setIsUploadingCertificate(true)
    try {
      // Prepare certification data
      // Include certificate_url if it was already uploaded (from preview)
      const certificationToSave = {
        ...formData,
        // Include certificate_url if it exists in formData (from previous upload)
        certificate_url: formData.certificate_url || undefined,
      }
      
      // Check if editing existing or adding new
      const exists = certificationsData.find((c) => c.id === certificationToSave.id)
      let updatedCertifications: Certification[]
      let certificationIndex: number | undefined
      
      if (exists) {
        // Update existing certification
        const index = certificationsData.findIndex((c) => c.id === certificationToSave.id)
        updatedCertifications = certificationsData.map((c) => (c.id === certificationToSave.id ? certificationToSave : c))
        certificationIndex = index
      } else {
        // Add new certification
        updatedCertifications = [...certificationsData, certificationToSave]
        certificationIndex = updatedCertifications.length - 1
      }

      // Upload certification with file if present (sends both together in FormData)
      const response = await updateCertificationsSection(
        user.id, 
        updatedCertifications, 
        certificateFile || undefined, // Pass file if available
        certificationIndex // Pass index so backend knows which certification to attach file to
      )
      
      // Check if certificate URL was returned in response and update the certification
      if (response.data && certificateFile) {
        // The backend should return the updated certifications with certificate_url
        // Extract it from the response if available
        // response.data is ProfileData which has certifications array directly
        const profileData = response.data
        const responseCertifications = profileData.certifications || []
        if (responseCertifications.length > 0 && certificationIndex !== undefined) {
          const updatedCert = responseCertifications[certificationIndex]
          if (updatedCert?.certificate_url || (updatedCert as CertificationWithUrls).certificateUrl) {
            // Update the certification with the URL from response
            const certWithUrls = updatedCert as CertificationWithUrls
            const certUrl = certWithUrls.certificate_url || certWithUrls.certificateUrl
            if (certUrl) {
              updatedCertifications[certificationIndex] = {
                ...updatedCertifications[certificationIndex],
                certificate_url: certUrl
              }
            }
          }
        }
      }
      
      // Refresh profile to get updated data
      await dispatch(fetchProfile(user.id))
      
      toast.success(exists ? 'Certification updated successfully!' : 'Certification added successfully!')
      
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save certification'
      toast.error(errorMsg)
      console.error('Certification save error:', error)
    } finally {
      setIsSubmitting(false)
      setIsUploadingCertificate(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  
  const handleCertificateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setCertificateError(null)
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setCertificateError('Invalid file type. Only JPG, PNG, and PDF are allowed.')
      return
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setCertificateError('File size exceeds 5MB limit.')
      return
    }
    
    setCertificateFile(file)
    setCertificateFileName(file.name)
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file)
      setCertificatePreview(previewUrl)
    } else {
      // For PDFs, just show the filename
      setCertificatePreview(null)
    }
  }
  
  const handleRemoveCertificate = () => {
    if (certificatePreview && certificatePreview.startsWith('blob:')) {
      URL.revokeObjectURL(certificatePreview)
    }
    setCertificateFile(null)
    setCertificatePreview(null)
    setCertificateFileName('')
    setCertificateError(null)
    // Clear certificate_url from formData
    setFormData((prev) => ({ ...prev, certificate_url: undefined }))
  }
  
  const handleCertificateUpload = async () => {
    if (!certificateFile || !user?.id) return
    
    setIsUploadingCertificate(true)
    setCertificateError(null)
    
    try {
      // Upload certificate file using profile edit API with FormData
      // According to ticket: use PUT /api/profile/edit with FormData containing certificate
      const tokens = await import('@/lib/tokens').then(m => m.tokenStorage.getStoredTokens())
      if (!tokens?.access_token) {
        throw new Error('Authentication required')
      }
      
      // Create FormData with certificate file
      const uploadFormData = new FormData()
      uploadFormData.append('certificate', certificateFile)
      
      // Include certification data if editing
      if (certificationData?.id) {
        uploadFormData.append('certificationId', certificationData.id.toString())
      }
      
      // Import env to get API URL
      const { env } = await import('@/lib/env')
      const response = await fetch(`${env.API_URL}/profile/edit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
        body: uploadFormData,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to upload certificate')
      }
      
      const data = await response.json()
      const certificateUrl = data.data?.certificateUrl || data.data?.certificate_url
      
      if (certificateUrl) {
        setFormData((prev) => ({ ...prev, certificate_url: certificateUrl }))
        setCertificatePreview(certificateUrl)
        toast.success('Certificate uploaded successfully!')
      } else {
        throw new Error('Certificate URL not returned from server')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to upload certificate'
      setCertificateError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsUploadingCertificate(false)
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
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-xl"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {certificationData ? 'Edit Certification' : 'Add Certification'}
                </h2>
                <button className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors" onClick={onClose}>
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <style jsx>{`
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

                <FormInput
                  label="Certification Name *"
                  name="certification_name"
                  value={formData.certification_name}
                  onChange={handleChange}
                  error={errors.certification_name}
                  placeholder="e.g., AWS Certified Solutions Architect"
                />

                <FormInput
                  label="Issuing Authority *"
                  name="issuing_authority"
                  value={formData.issuing_authority}
                  onChange={handleChange}
                  error={errors.issuing_authority}
                  placeholder="e.g., Amazon Web Services"
                />

                <FormInput
                  label="License/Credential Number (Optional)"
                  name="license_number"
                  value={formData.license_number || ''}
                  onChange={handleChange}
                  placeholder="e.g., ABC-123-XYZ"
                />

                <FormInput
                  label="Issue Date (MM/YYYY) *"
                  name="issue_date"
                  value={formData.issue_date}
                  onChange={handleChange}
                  error={errors.issue_date}
                  placeholder="e.g., 03/2023"
                />

                {!formData.never_expires && (
                  <FormInput
                    label="Expiration Date (MM/YYYY) *"
                    name="expiration_date"
                    value={formData.expiration_date || ''}
                    onChange={handleChange}
                    error={errors.expiration_date}
                    placeholder="e.g., 03/2026"
                  />
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="never_expires"
                    name="never_expires"
                    checked={formData.never_expires}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
                  />
                  <label htmlFor="never_expires" className="text-sm text-neutral-600 dark:text-neutral-400">
                    This certification does not expire
                  </label>
                </div>

                <FormInput
                  label="Verification URL (Optional)"
                  name="verification_url"
                  value={formData.verification_url || ''}
                  onChange={handleChange}
                  error={errors.verification_url}
                  placeholder="https://..."
                  type="url"
                />

                {/* Certificate File Upload */}
                <div>
                  <label className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 block">
                    Certificate File (Optional)
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleCertificateFileChange}
                        className="hidden"
                        id="certificate-upload"
                        disabled={isUploadingCertificate}
                      />
                      <label
                        htmlFor="certificate-upload"
                        className={`flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 ${isUploadingCertificate ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isUploadingCertificate ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            {certificateFile ? 'Change File' : 'Choose File (JPG, PNG, or PDF - Max 5MB)'}
                          </>
                        )}
                      </label>
                      {certificateFile && !isUploadingCertificate && (
                        <button
                          type="button"
                          onClick={handleRemoveCertificate}
                          className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* File Preview */}
                    {certificatePreview && (
                      <div className="mt-2">
                        {certificateFile?.type.startsWith('image/') || (certificatePreview && !certificatePreview.startsWith('blob:')) ? (
                          <div className="relative">
                            <img
                              src={certificatePreview}
                              alt="Certificate preview"
                              className="w-full max-h-48 object-contain rounded-lg border border-neutral-300 dark:border-neutral-700"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                            <Shield className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                            <span className="text-sm text-neutral-900 dark:text-white flex-1">{certificateFileName}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {certificateError && (
                      <p className="text-xs text-red-500 mt-1">{certificateError}</p>
                    )}
                    
                    {/* Info Message */}
                    {!certificateFile && !certificatePreview && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Upload a certificate file (JPG, PNG, or PDF) - Maximum 5MB
                      </p>
                    )}
                  </div>
                </div>

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

// Certification Card Component - No description field, so no show more/less needed
const CertificationCard = ({ 
  cert, 
  isSelfProfile, 
  onEdit, 
  onDelete, 
  isDeleting,
  isExpired 
}: { 
  cert: Certification; 
  isSelfProfile: boolean; 
  onEdit: () => void; 
  onDelete: () => void; 
  isDeleting: boolean;
  isExpired: boolean;
}) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Handle certificate download - uses multiple strategies for compatibility
  const handleDownload = async (certUrl: string, fileName?: string) => {
    if (!certUrl) {
      toast.error('Certificate URL is missing');
      return;
    }
    
    setIsDownloading(true);
    
    try {
      // Validate and normalize URL
      let normalizedUrl: string;
      try {
        // Try to create URL object - if it fails, it's a relative URL
        new URL(certUrl);
        normalizedUrl = certUrl;
      } catch (e) {
        // If URL is relative, make it absolute
        if (certUrl.startsWith('/')) {
          normalizedUrl = `${window.location.origin}${certUrl}`;
        } else {
          // Try to construct absolute URL
          normalizedUrl = `${window.location.origin}/${certUrl}`;
        }
      }
      
      // Check if URL is from the same origin
      let urlObj: URL;
      try {
        urlObj = new URL(normalizedUrl);
      } catch (e) {
        throw new Error('Invalid certificate URL');
      }
      
      const isSameOrigin = urlObj.origin === window.location.origin;
      
      // Strategy 1: For same-origin URLs, try using anchor tag with download attribute first
      if (isSameOrigin) {
        try {
          const downloadFileName = fileName || normalizedUrl.split('/').pop() || 'certificate';
          const link = document.createElement('a');
          link.href = normalizedUrl;
          link.download = downloadFileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Small delay to check if download started
          await new Promise(resolve => setTimeout(resolve, 500));
          
          toast.success('Certificate download started');
          setIsDownloading(false);
          return;
        } catch (e) {
          console.log('Anchor download failed, trying fetch method:', e);
        }
      }
      
      // Strategy 2: Fetch as blob (works for same-origin and CORS-enabled cross-origin)
      try {
        const fetchOptions: RequestInit = {
          method: 'GET',
          headers: {},
        };
        
        // If same origin, try to include auth token
        if (isSameOrigin) {
          try {
            const { tokenStorage } = await import('@/lib/tokens');
            const tokens = tokenStorage.getStoredTokens();
            if (tokens?.access_token) {
              fetchOptions.headers = {
                Authorization: `Bearer ${tokens.access_token}`,
              };
            }
          } catch (e) {
            // Ignore errors getting token
          }
        }
        
        const response = await fetch(normalizedUrl, fetchOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        const downloadFileName = fileName || normalizedUrl.split('/').pop() || 'certificate';
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadFileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
        
        toast.success('Certificate downloaded successfully');
        setIsDownloading(false);
        return;
      } catch (fetchError) {
        console.log('Fetch method failed:', fetchError);
        // Continue to fallback strategy
      }
      
      // Strategy 3: Fallback - open in new tab (works for all URLs)
      toast.info('Opening certificate in new tab for download...');
      window.open(normalizedUrl, '_blank');
      setIsDownloading(false);
      
    } catch (error) {
      console.error('Download failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to download certificate';
      toast.error(errorMsg);
      
      // Final fallback: try to open in new tab
      try {
        window.open(certUrl, '_blank');
      } catch (e) {
        toast.error('Please try downloading the certificate manually');
      }
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex gap-4 relative group overflow-hidden min-w-0">
      {/* Certification Icon */}
      <div className="w-12 h-12 shrink-0 mt-1 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
        <Shield className="text-green-600 dark:text-green-400" size={24} />
      </div>

      {/* Certification Details */}
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="overflow-hidden min-w-0 flex-1">
            <h3 
              className="font-semibold text-neutral-900 dark:text-white text-lg overflow-hidden min-w-0"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {cert.certification_name}
            </h3>
            <p 
              className="text-neutral-700 dark:text-neutral-300 overflow-hidden min-w-0"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {cert.issuing_authority}
            </p>
            {cert.license_number && (
              <p 
                className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 overflow-hidden min-w-0"
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                License: {cert.license_number}
              </p>
            )}
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Issued: {cert.issue_date}
              {cert.never_expires ? (
                <span className="ml-2 text-green-600 dark:text-green-400">• No Expiration</span>
              ) : cert.expiration_date ? (
                <>
                  <span className="mx-1">•</span>
                  Expires: {cert.expiration_date}
                  {isExpired && (
                    <span className="ml-2 text-red-600 dark:text-red-400">• Expired</span>
                  )}
                </>
              ) : null}
            </p>
          </div>
        </div>
        {cert.verification_url && (
          <a
            href={cert.verification_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
          >
            <ExternalLink size={16} />
            Verify Certificate
          </a>
        )}
        
        {/* Certificate File Display */}
        {(() => {
          const certWithUrls = cert as CertificationWithUrls;
          const certUrl = certWithUrls.certificate_url || certWithUrls.certificateUrl || certWithUrls.certificate_file_url;
          return certUrl && (
            <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-start gap-3">
                {(() => {
                const isPdf = certUrl && certUrl.toLowerCase().endsWith('.pdf');
                return isPdf ? (
                <>
                  <div className="w-16 h-16 shrink-0 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Certificate File
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate mb-2">
                      {certUrl.split('/').pop()}
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={certUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
                        title="View Certificate"
                      >
                        <Eye size={14} />
                        View PDF
                      </a>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(certUrl, certUrl.split('/').pop());
                        }}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Certificate"
                      >
                        {isDownloading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        Download
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative shrink-0">
                    <img
                      src={certUrl}
                      alt="Certificate"
                      className="w-32 h-32 object-contain rounded-lg border-2 border-neutral-300 dark:border-neutral-700 cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
                      onClick={() => window.open(certUrl, '_blank')}
                      title="Click to view full size"
                      onError={(e) => {
                        console.error('Certificate image failed to load:', certUrl);
                        // Fallback: hide image on error
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/5 rounded-lg transition-colors pointer-events-none" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      Certificate Preview
                    </p>
                    <div className="flex flex-col gap-2">
                      <a
                        href={certUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors w-fit"
                        title="View Certificate"
                      >
                        <Eye size={14} />
                        View Full Size
                      </a>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(certUrl, certUrl.split('/').pop());
                        }}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors w-fit disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Certificate"
                      >
                        {isDownloading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        Download
                      </button>
                    </div>
                  </div>
                </>
              );
              })()}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Edit and Delete Buttons (Only for Self Profile) */}
      {isSelfProfile && (
        <div className="absolute top-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
            title="Edit Certification"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
            title="Delete Certification"
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

// Main Certifications Section Component
const CertificationsSection = ({ certificationsData, isSelfProfile, onSave, className = '' }: CertificationsSectionProps) => {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const [isEditModalOpen, setEditModalOpen] = useState(false)
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleAdd = () => {
    setEditingCertification(null)
    setEditModalOpen(true)
  }

  const handleEdit = (cert: Certification) => {
    setEditingCertification(cert)
    setEditModalOpen(true)
  }

  const handleDelete = async (certId: number) => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }
    
    if (!confirm('Are you sure you want to delete this certification?')) {
      return
    }

    setDeletingId(certId)
    try {
      const updatedCertifications = certificationsData.filter((c) => c.id !== certId)
      await updateCertificationsSection(user.id, updatedCertifications)
      
      // Refresh profile to get updated data
      await dispatch(fetchProfile(user.id))
      
      toast.success('Certification deleted successfully!')
      
      if (onSave) {
        onSave(updatedCertifications)
      }
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete certification'
      toast.error(errorMsg)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1)
    if (onSave) {
      // Trigger parent refresh if callback provided
      onSave(certificationsData)
    }
  }

  const isExpired = (cert: Certification) => {
    if (cert.never_expires || !cert.expiration_date) return false
    const [month, year] = cert.expiration_date.split('/').map(Number)
    const expDate = new Date(year, month - 1)
    return expDate < new Date()
  }

  return (
    <Section className={className}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">Certifications</h2>
        {isSelfProfile && (
          <Button variant="secondary" className="h-auto p-2.5" onClick={handleAdd}>
            <Plus size={20} />
          </Button>
        )}
      </div>

      {certificationsData.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">No certifications added yet.</p>
          {isSelfProfile && (
            <Button className="mt-4" onClick={handleAdd}>
              <Plus size={18} />
              Add Certification
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {certificationsData.map((cert) => (
            <CertificationCard
              key={cert.id}
              cert={cert}
              isSelfProfile={isSelfProfile}
              onEdit={() => handleEdit(cert)}
              onDelete={() => handleDelete(cert.id)}
              isDeleting={deletingId === cert.id}
              isExpired={isExpired(cert)}
            />
          ))}
        </div>
      )}

      <EditCertificationModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        certificationData={editingCertification}
        certificationsData={certificationsData}
        onSuccess={handleSuccess}
      />
    </Section>
  )
}

export default CertificationsSection
