"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Briefcase, X } from 'lucide-react';
import { getProfile, updateExperienceSection, type Experience as APIExperience } from '@/lib/api/profile';
import { useAppSelector } from '@/store/hooks';

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

type Experience = APIExperience & { id: number | string };

type ExperienceSectionProps = {
  experienceData: Experience[];
  isSelfProfile: boolean;
  onSave: (data: Experience[]) => void;
  onExperienceRefresh?: () => void | Promise<void>;
  className?: string;
};

type EditExperienceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  experienceData: Experience | null;
  onSave: (data: Experience) => void;
  isLoading?: boolean;
};

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
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
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

const employmentTypes: APIExperience['employment_type'][] = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
];

const formatDate = (value?: string | null) => {
  if (!value) return 'Present';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short' }).format(date);
};

const EditExperienceModal = ({ isOpen, onClose, experienceData, onSave, isLoading = false }: EditExperienceModalProps) => {
  const defaultExperience: Experience = experienceData
    ? { ...experienceData }
    : {
        id: Date.now(),
        company_name: '',
        job_title: '',
        employment_type: 'Full-time',
        industry: '',
        start_date: '',
        end_date: '',
        job_description: '',
        currently_working: false,
      };

  const [formData, setFormData] = useState<Experience>(defaultExperience);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (experienceData) {
      setFormData({
        ...experienceData,
        end_date: experienceData.end_date ?? '',
      });
    } else {
      setFormData({
        id: Date.now(),
        company_name: '',
        job_title: '',
        employment_type: 'Full-time',
        industry: '',
        start_date: '',
        end_date: '',
        job_description: '',
        currently_working: false,
      });
    }
    setErrors({});
  }, [experienceData, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.job_title || formData.job_title.trim().length === 0) {
      newErrors.job_title = 'Job title is required.';
    }

    if (!formData.company_name || formData.company_name.trim().length === 0) {
      newErrors.company_name = 'Company name is required.';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required.';
    }

    if (!formData.currently_working && !formData.end_date) {
      newErrors.end_date = 'End date is required unless you are currently working here.';
    }

    if (formData.start_date && formData.end_date && !formData.currently_working) {
      const start = new Date(formData.start_date).getTime();
      const end = new Date(formData.end_date).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        newErrors.end_date = 'End date cannot be before start date.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        end_date: formData.currently_working ? '' : formData.end_date,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      const checked = e.target.checked;
      setFormData((prev) => ({
        ...prev,
        currently_working: checked,
        end_date: checked ? '' : prev.end_date,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            variants={modalContentVariants}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-3xl border border-neutral-200 bg-white shadow-xl transition-colors dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 p-6 dark:border-neutral-800">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {experienceData ? 'Edit Experience' : 'Add Experience'}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Share your professional journey and key responsibilities.
                </p>
              </div>
              <button
                className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">Job Title *</label>
                  <input
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                    className={`mt-1 w-full rounded-lg border bg-neutral-100 p-3 text-neutral-900 transition-colors dark:bg-neutral-800 dark:text-white ${
                      errors.job_title ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                    placeholder="e.g., Senior Process Engineer"
                  />
                  {errors.job_title && <p className="text-xs text-red-500 mt-1">{errors.job_title}</p>}
                </div>
                <div>
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">Company *</label>
                  <input
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className={`mt-1 w-full rounded-lg border bg-neutral-100 p-3 text-neutral-900 transition-colors dark:bg-neutral-800 dark:text-white ${
                      errors.company_name ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                    placeholder="e.g., Sartorius India"
                  />
                  {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">Employment Type *</label>
                  <select
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-neutral-100 p-3 text-neutral-900 transition-colors dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    {employmentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">Industry (optional)</label>
                  <input
                    name="industry"
                    value={formData.industry || ''}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-neutral-100 p-3 text-neutral-900 transition-colors dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    placeholder="e.g., Biotechnology"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className={`mt-1 w-full rounded-lg border bg-neutral-100 p-3 text-neutral-900 transition-colors dark:bg-neutral-800 dark:text-white ${
                      errors.start_date ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                  />
                  {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
                </div>
                <div>
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">End Date {formData.currently_working ? '(disabled)' : '*'}</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date || ''}
                    onChange={handleChange}
                    disabled={formData.currently_working}
                    className={`mt-1 w-full rounded-lg border bg-neutral-100 p-3 text-neutral-900 transition-colors dark:bg-neutral-800 dark:text-white ${
                      errors.end_date ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
                    } ${formData.currently_working ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                  {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
                <input
                  id="currently_working"
                  type="checkbox"
                  name="currently_working"
                  checked={!!formData.currently_working}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="currently_working" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  I currently work in this role
                </label>
              </div>

              <div>
                <label className="text-sm text-neutral-600 dark:text-neutral-400">Description</label>
                <textarea
                  name="job_description"
                  value={formData.job_description || ''}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Summarize your responsibilities, achievements, and key projects..."
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-neutral-100 p-3 text-neutral-900 transition-colors dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">This will be visible on your profile.</p>
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : experienceData ? 'Save changes' : 'Add experience'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ExperienceSection = ({ experienceData, isSelfProfile, onSave, onExperienceRefresh, className = '' }: ExperienceSectionProps) => {
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingExperience, setDeletingExperience] = useState<Experience | null>(null);
  const user = useAppSelector((state) => state.auth.user);

  const handleAdd = () => {
    setEditingExperience(null);
    setEditModalOpen(true);
  };

  const handleEdit = (experience: Experience) => {
    setEditingExperience(experience);
    setEditModalOpen(true);
  };

  const sanitizeExperience = (exp: Experience): APIExperience => {
    return {
      company_name: exp.company_name.trim(),
      job_title: exp.job_title.trim(),
      employment_type: exp.employment_type,
      industry: exp.industry?.trim() || undefined,
      start_date: exp.start_date,
      end_date: exp.currently_working ? null : exp.end_date || null,
      job_description: exp.job_description?.trim() || undefined,
      currently_working: !!exp.currently_working,
    };
  };

  const handleSave = async (experience: Experience) => {
    if (!user?.id) {
      setUploadError('User not authenticated');
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    setIsLoading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const exists = experienceData.some((exp) => exp.id === experience.id);
      let updatedExperienceData: Experience[];

      if (exists) {
        updatedExperienceData = experienceData.map((exp) => (exp.id === experience.id ? experience : exp));
      } else {
        updatedExperienceData = [experience, ...experienceData];
      }

      const cleanExperienceArray: APIExperience[] = updatedExperienceData
        .map((exp) => sanitizeExperience(exp))
        .filter((exp) => exp.company_name && exp.job_title);

      await updateExperienceSection(user.id, cleanExperienceArray);

      if (onExperienceRefresh) {
        await onExperienceRefresh();
      } else {
        const profile = await getProfile(user.id);
        if (profile && profile.success && profile.data && profile.data.experience) {
          const filteredExperience = profile.data.experience.filter((exp) => exp && Object.keys(exp).length > 0);
          if (typeof onSave === 'function') {
            onSave(filteredExperience.map((exp, idx) => ({ ...exp, id: Date.now() + idx })) as Experience[]);
          }
        }
      }

      setUploadSuccess(exists ? 'Experience updated successfully!' : 'Experience added successfully!');
      setEditModalOpen(false);
      setEditingExperience(null);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save experience';
      setUploadError(errorMsg);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id || !deletingExperience) return;

    setIsLoading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const updatedExperienceData = experienceData.filter((exp) => exp.id !== deletingExperience.id);
      const cleanExperienceArray: APIExperience[] = updatedExperienceData
        .map((exp) => sanitizeExperience(exp))
        .filter((exp) => exp.company_name && exp.job_title);

      await updateExperienceSection(user.id, cleanExperienceArray);

      if (onExperienceRefresh) {
        await onExperienceRefresh();
      } else {
        const profile = await getProfile(user.id);
        if (profile && profile.success && profile.data && profile.data.experience) {
          const filteredExperience = profile.data.experience.filter((exp) => exp && Object.keys(exp).length > 0);
          if (typeof onSave === 'function') {
            onSave(filteredExperience.map((exp, idx) => ({ ...exp, id: Date.now() + idx })) as Experience[]);
          }
        }
      }

      setUploadSuccess('Experience deleted successfully!');
      setDeleteConfirmOpen(false);
      setDeletingExperience(null);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete experience';
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
                <span className="font-medium">Saving experience...</span>
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
                  <p className="font-medium">Failed to save experience</p>
                  <p className="mt-1 text-sm opacity-90">{uploadError}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-brand-gray-900 text-2xl font-bold dark:text-white">Experience</h2>
        {isSelfProfile && (
          <Button variant="secondary" className="h-auto p-2.5" onClick={handleAdd}>
            <Plus size={18} />
            Add experience
          </Button>
        )}
      </div>

      {experienceData.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/60">
          <Briefcase className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">No experience added yet.</p>
          {isSelfProfile && (
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">Add your work history to showcase your background.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {experienceData.map((exp) => (
            <div
              key={exp.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-purple-200 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-purple-500/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{exp.job_title}</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">{exp.company_name}</p>
                      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        {exp.employment_type}
                        {exp.industry ? ` • ${exp.industry}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {formatDate(exp.start_date)} — {exp.currently_working ? 'Present' : formatDate(exp.end_date)}
                  </p>
                  {exp.job_description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {exp.job_description}
                    </p>
                  )}
                </div>
                {isSelfProfile && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(exp)}
                      className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      aria-label={`Edit ${exp.job_title}`}
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingExperience(exp);
                        setDeleteConfirmOpen(true);
                      }}
                      className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-neutral-500 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                      aria-label={`Delete ${exp.job_title}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditExperienceModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        experienceData={editingExperience}
        onSave={handleSave}
        isLoading={isLoading}
      />

      <AnimatePresence>
        {deleteConfirmOpen && deletingExperience && (
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={() => setDeleteConfirmOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              variants={modalContentVariants}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl transition-colors dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Remove experience?</h3>
                <button
                  className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                  onClick={() => setDeleteConfirmOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                This will permanently remove <span className="font-semibold">{deletingExperience.job_title}</span> at{' '}
                <span className="font-semibold">{deletingExperience.company_name}</span> from your profile.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteConfirm} disabled={isLoading}>
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
};

export default ExperienceSection;

