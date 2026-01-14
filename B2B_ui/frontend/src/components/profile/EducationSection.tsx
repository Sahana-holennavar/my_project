"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, GraduationCap, Edit3, Trash2 } from 'lucide-react';
import { getProfile, updateEducationSection, type Education as APIEducation } from '@/lib/api/profile';
import { useAppSelector } from '@/store/hooks';

// Animation variants
const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalContentVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 200 },
  },
  exit: { opacity: 0, y: -50 },
};

// Types
type Education = APIEducation & { id: number };

type EducationSectionProps = {
  educationData: Education[];
  isSelfProfile: boolean;
  onSave: (data: Education[]) => void;
  onEducationRefresh?: () => void | Promise<void>;
  className?: string;
};

type EditEducationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  educationData: Education | null;
  onSave: (data: Education) => void;
  isLoading?: boolean;
};

// UI Components
type ButtonProps = {
  className?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
};

const Button = ({ className = '', children, variant = 'primary', ...props }: ButtonProps) => {
  const baseStyle = 'px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-sm';
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20',
    secondary: '!bg-white !text-neutral-800 dark:!bg-neutral-800 dark:!text-white hover:!bg-neutral-100 dark:hover:!bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition-colors',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20',
  };
  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

type SectionProps = {
  children: React.ReactNode;
  className?: string;
};

const Section = ({ children, className = '' }: SectionProps) => (
  <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-lg transition-colors ${className}`}>
    {children}
  </div>
);

// Form Components
type FormInputProps = {
  label: string;
  name: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  inputMode?: string;
};

const FormInput = ({ label, name, value, onChange, error, type, placeholder, inputMode, ...props }: FormInputProps) => (
  <div>
    <label className="text-sm text-neutral-600 dark:text-neutral-400">{label}</label>
    <input
      name={name}
      value={value || ''}
      onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
      type={type}
      placeholder={placeholder}
      inputMode={inputMode as React.InputHTMLAttributes<HTMLInputElement>['inputMode']}
      {...props}
      className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
        error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
      } rounded-lg p-3 mt-1 text-neutral-900 dark:text-white transition-colors`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

type FormSelectProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  children: React.ReactNode;
};

const FormSelect = ({ label, name, value, onChange, error, children }: FormSelectProps) => (
  <div>
    <label className="text-sm text-neutral-600 dark:text-neutral-400">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
        error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
      } rounded-lg p-3 mt-1 text-neutral-900 dark:text-white transition-colors`}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// Edit Education Modal
const EditEducationModal = ({ isOpen, onClose, educationData, onSave, isLoading = false }: EditEducationModalProps) => {
  const [formData, setFormData] = useState<Education>(
    educationData || {
      id: Date.now(),
      institution_name: '',
      degree_type: "Bachelor's" as const,
      field_of_study: '',
      start_year: new Date().getFullYear(),
      end_year: new Date().getFullYear(),
      gpa_grade: undefined,
      percentage: undefined,
      currently_studying: false,
    }
  );

  const [gradeType, setGradeType] = useState<'gpa' | 'percentage'>(
    educationData && typeof educationData.gpa_grade === 'number' ? 'gpa' : 'percentage'
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (educationData) {
      setFormData(educationData);
      setGradeType(typeof educationData.gpa_grade === 'number' || typeof educationData.gpa_grade === 'string' ? 'gpa' : 'percentage');
    } else {
      setFormData({
        id: Date.now(),
        institution_name: '',
        degree_type: "Bachelor's" as const,
        field_of_study: '',
        start_year: new Date().getFullYear(),
        end_year: new Date().getFullYear(),
        gpa_grade: undefined,
        currently_studying: false,
      });
      setGradeType('gpa');
    }
  }, [educationData, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.institution_name || formData.institution_name.trim().length === 0) {
      newErrors.institution_name = 'Institution name is required.';
    } else if (formData.institution_name.trim().length < 2) {
      newErrors.institution_name = 'Institution name must be at least 2 characters.';
    }

    if (!formData.field_of_study || formData.field_of_study.trim().length === 0) {
      newErrors.field_of_study = 'Field of study is required.';
    } else if (formData.field_of_study.trim().length < 2) {
      newErrors.field_of_study = 'Field of study must be at least 2 characters.';
    }

    if (gradeType === 'gpa') {
      if (formData.gpa_grade !== undefined && formData.gpa_grade !== null) {
        const gpaValue = typeof formData.gpa_grade === 'string' ? formData.gpa_grade.trim() : String(formData.gpa_grade);
        if (gpaValue) {
          const letterGradePattern = /^[A-Z][+-]?$/i;
          const numericValue = parseFloat(gpaValue);
          const isValidNumber = !isNaN(numericValue) && numericValue >= 1 && numericValue <= 10;
          const isValidLetter = letterGradePattern.test(gpaValue);
          if (!isValidNumber && !isValidLetter) {
            newErrors.gpa_grade = 'GPA/Grade must be a number between 1 and 10 or a letter grade (A+, A, B, C, O, etc.).';
          }
        }
      }
      formData.percentage = undefined;
    } else {
      if (formData.percentage !== undefined && formData.percentage !== null) {
        if (formData.percentage < 0 || formData.percentage > 100) {
          newErrors.percentage = 'Percentage must be between 0 and 100.';
        }
      }
      formData.gpa_grade = undefined;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'start_year' || name === 'end_year') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || new Date().getFullYear() }));
    } else if (name === 'gpa_grade') {
      const trimmedValue = value.trim();
      if (trimmedValue === '') {
        setFormData((prev) => ({ ...prev, [name]: undefined }));
      } else {
        const numericValue = parseFloat(trimmedValue);
        if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 10) {
          setFormData((prev) => ({ ...prev, [name]: numericValue }));
        } else {
          setFormData((prev) => ({ ...prev, [name]: trimmedValue as string }));
        }
      }
    } else if (name === 'percentage') {
      const numericValue = value.replace(/[^0-9.]/g, '');
      if (numericValue === '' || numericValue === '.') {
        setFormData((prev) => ({ ...prev, [name]: undefined }));
      } else {
        const numValue = parseFloat(numericValue);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
          setFormData((prev) => ({ ...prev, [name]: numValue }));
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

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
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {educationData ? 'Edit Education' : 'Add Education'}
                </h2>
                <button
                  className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  <X size={22} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  label="Institution Name *"
                  name="institution_name"
                  value={formData.institution_name}
                  onChange={handleChange}
                  error={errors.institution_name}
                  placeholder="e.g., University of California"
                />
                <FormSelect
                  label="Degree Type *"
                  name="degree_type"
                  value={formData.degree_type}
                  onChange={handleChange}
                  error={errors.degree_type}
                >
                  <option value="Bachelor's">Bachelor&apos;s</option>
                  <option value="Master's">Master&apos;s</option>
                  <option value="PhD">PhD</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Certificate">Certificate</option>
                </FormSelect>
                <FormInput
                  label="Field of Study *"
                  name="field_of_study"
                  value={formData.field_of_study}
                  onChange={handleChange}
                  error={errors.field_of_study}
                  placeholder="e.g., Computer Science"
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Start Year *"
                    name="start_year"
                    type="number"
                    value={formData.start_year}
                    onChange={handleChange}
                    error={errors.start_year}
                  />
                  {!formData.currently_studying && (
                    <FormInput
                      label="End Year"
                      name="end_year"
                      type="number"
                      value={formData.end_year}
                      onChange={handleChange}
                      error={errors.end_year}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="currently_studying"
                    checked={formData.currently_studying}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
                  />
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">
                    Currently studying
                  </label>
                </div>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gradeType"
                      checked={gradeType === 'gpa'}
                      onChange={() => setGradeType('gpa')}
                      className="accent-purple-600"
                    />
                    <span className="text-sm">GPA/Grade (1-10 or A+, B, C, O, etc.)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gradeType"
                      checked={gradeType === 'percentage'}
                      onChange={() => setGradeType('percentage')}
                      className="accent-purple-600"
                    />
                    <span className="text-sm">Percentage (0-100)</span>
                  </label>
                </div>
                {gradeType === 'gpa' ? (
                  <div>
                    <FormInput
                      label="GPA/Grade"
                      name="gpa_grade"
                      value={typeof formData.gpa_grade === 'string' ? formData.gpa_grade : (formData.gpa_grade?.toString() || '')}
                      onChange={handleChange}
                      placeholder="e.g., 9.5 or A+"
                      type="text"
                      error={errors.gpa_grade}
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-1">
                      Enter a number (1-10) or letter grade (A+, A, B, C, O, etc.)
                    </p>
                  </div>
                ) : (
                  <div>
                    <FormInput
                      label="Percentage"
                      name="percentage"
                      value={formData.percentage?.toString() || ''}
                      onChange={handleChange}
                      placeholder="e.g., 85.5"
                      type="text"
                      inputMode="decimal"
                      error={errors.percentage}
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-1">
                      Enter numbers only (0-100)
                    </p>
                  </div>
                )}
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
  );
};

// Main Education Section Component
const EducationSection = ({ educationData, isSelfProfile, onSave, onEducationRefresh, className = '' }: EducationSectionProps) => {
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingEducation, setDeletingEducation] = useState<Education | null>(null);
  const user = useAppSelector((state) => state.auth.user);

  const handleAdd = () => {
    setEditingEducation(null);
    setEditModalOpen(true);
  };

  const handleEdit = (edu: Education) => {
    setEditingEducation(edu);
    setEditModalOpen(true);
  };

  const handleSave = async (eduData: Education) => {
    if (!user?.id) {
      setUploadError('User not authenticated');
      setTimeout(() => setUploadError(null), 5000);
      return;
    }
    try {
      setIsLoading(true);
      setUploadError(null);
      setUploadSuccess(null);
      const exists = educationData.find((e) => e.id === eduData.id);
      let updatedEducationData: Education[];
      if (exists) {
        updatedEducationData = educationData.map((e) => (e.id === eduData.id ? eduData : e));
      } else {
        updatedEducationData = [eduData, ...educationData];
      }
      const cleanEducationArray: APIEducation[] = updatedEducationData
        .map(({ id, ...edu }) => edu as APIEducation)
        .filter((e) => e && e.institution_name && e.institution_name.trim().length > 0);
      await updateEducationSection(user.id, cleanEducationArray);
      if (onEducationRefresh) {
        await onEducationRefresh();
      } else {
        const profile = await getProfile(user.id);
        if (profile && profile.success && profile.data && profile.data.education) {
          const filteredEducation = profile.data.education.filter((e) => e && Object.keys(e).length > 0);
          if (typeof onSave === 'function') {
            onSave(filteredEducation.map((e, idx) => ({ ...e, id: Date.now() + idx })));
          }
        }
      }
      setUploadSuccess(exists ? 'Education updated successfully!' : 'Education added successfully!');
      setEditModalOpen(false);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update education';
      setUploadError(errorMsg);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (edu: Education) => {
    setDeletingEducation(edu);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id || !deletingEducation) return;
    setIsLoading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const updatedEducationData = educationData.filter((e) => e.id !== deletingEducation.id);
      const cleanEducationArray: APIEducation[] = updatedEducationData
        .map(({ id, ...edu }) => edu as APIEducation)
        .filter((e) => e && e.institution_name && e.institution_name.trim().length > 0);
      await updateEducationSection(user.id, cleanEducationArray);
      if (onEducationRefresh) {
        await onEducationRefresh();
      } else {
        const profile = await getProfile(user.id);
        if (profile && profile.success && profile.data && profile.data.education) {
          const filteredEducation = profile.data.education.filter((e) => e && Object.keys(e).length > 0);
          if (typeof onSave === 'function') {
            onSave(filteredEducation.map((e, idx) => ({ ...e, id: Date.now() + idx })));
          }
        }
      }
      setUploadSuccess('Education deleted successfully!');
      setDeleteConfirmOpen(false);
      setDeletingEducation(null);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete education';
      setUploadError(errorMsg);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

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
                <span className="font-medium">Saving education...</span>
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
                  <p className="font-medium">Failed to save education</p>
                  <p className="text-sm mt-1 opacity-90">{uploadError}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">Education</h2>
        {isSelfProfile && (
          <Button variant="secondary" className="h-auto p-2.5" onClick={handleAdd}>
            <Plus size={20} />
          </Button>
        )}
      </div>
      {educationData.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600 mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">No education added yet.</p>
          {isSelfProfile && (
            <Button className="mt-4" onClick={handleAdd}>
              <Plus size={18} />
              Add Education
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {educationData.map((edu) => (
            <div key={edu.id} className="flex gap-4 relative group">
              {/* Institution Icon */}
              <div className="w-12 h-12 shrink-0 mt-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-lg">
                {edu.institution_name.charAt(0).toUpperCase()}
              </div>

              {/* Education Details */}
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">{edu.degree_type}</h3>
                <p className="text-neutral-700 dark:text-neutral-300">{edu.institution_name}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{edu.field_of_study}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {edu.start_year} - {edu.currently_studying ? 'Present' : edu.end_year}
                  {edu.gpa_grade && ` • GPA/Grade: ${edu.gpa_grade}`}
                  {typeof edu.percentage === 'number' && ` • Percentage: ${edu.percentage}%`}
                </p>
              </div>

              {/* Edit & Delete Buttons (Only for Self Profile) */}
              {isSelfProfile && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(edu)}
                    className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(edu)}
                    className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
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
                      <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Delete Education</h2>
                      <button
                        className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                        onClick={() => !isLoading && setDeleteConfirmOpen(false)}
                        aria-disabled={isLoading}
                      >
                        <X size={22} />
                      </button>
                    </div>
                    <p className="mb-6 text-neutral-700 dark:text-neutral-300">
                      Are you sure you want to delete this education entry? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={() => setDeleteConfirmOpen(false)} aria-disabled={isLoading}>
                        Cancel
                      </Button>
                      <Button type="button" variant="danger" onClick={handleDeleteConfirm} aria-disabled={isLoading}>
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
      <EditEducationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!isLoading) setEditModalOpen(false);
        }}
        educationData={editingEducation}
        onSave={handleSave}
        isLoading={isLoading}
      />
    </Section>
  );
};

export default EducationSection;
