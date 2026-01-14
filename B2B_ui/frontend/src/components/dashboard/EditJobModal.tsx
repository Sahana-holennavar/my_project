"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Users,
  FileText,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateJob } from "@/store/slices/jobsSlice";
import type { JobPosting, JobType, JobStatus, JobMode} from "@/types/jobs";
import type { AppDispatch } from "@/store";

interface EditJobModalProps {
  isOpen: boolean;
  job: JobPosting;
  profileId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const jobTypeOptions: { value: JobType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' }
];

const jobStatusOptions: { value: JobStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
];

const jobModeOptions: { value: JobMode; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
];


export default function EditJobModal({ isOpen, job, profileId, onClose, onSuccess }: EditJobModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    job_description: '',
    employment_type: 'full_time' as JobType,
    status: 'active' as JobStatus,
    job_mode: 'remote' as JobMode,
    skills: [] as string[],
    skillInput: '',
    location: {
      city: '',
      state: '',
      country: '',
    },
    experience_level: {
      min: 1,
      max: 3,
    },
  });

  // Initialize form data when job changes
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        job_description: job.job_description || job.description || '',
        employment_type: job.employment_type || job.jobType || 'full_time',
        status: job.status || 'active',
        job_mode: job.job_mode  || 'remote',
        skills: job.skills || [],
        skillInput: '',
        location: (() => {
          // Handle location data which can be either object or string
          if (typeof job.location === 'object' && job.location !== null) {
            // Original object format from API
            return {
              city: job.location.city ? String(job.location.city) : '',
              state: job.location.state ? String(job.location.state) : '',
              country: job.location.country ? String(job.location.country) : 'US',
            };
          } else if (typeof job.location === 'string' && job.location !== 'Not specified') {
            // String format from Redux transformation (e.g., "Dubai, Dubai, UAE")
            const locationParts = job.location.split(', ');
            return {
              city: locationParts[0] || '',
              state: locationParts[1] || '',
              country: locationParts[2] || 'US',
            };
          } else {
            // Default empty location
            return {
              city: '',
              state: '',
              country: 'US',
            };
          }
        })(),
        experience_level: {
          min: typeof job.experience_level === 'object' && job.experience_level?.min ? Number(job.experience_level.min) : 1,
          max: typeof job.experience_level === 'object' && job.experience_level?.max ? Number(job.experience_level.max) : 3,
        },
      });
    }
  }, [job]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleNestedInputChange = (parent: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev] as Record<string, string | number>,
        [field]: value,
      },
    }));
    setError(null);
  };

  const addToArray = (arrayField: string, inputField: string) => {
    const value = formData[inputField as keyof typeof formData] as string;
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [arrayField]: [...(prev[arrayField as keyof typeof prev] as string[]), value.trim()],
        [inputField]: '',
      }));
    }
  };

  const removeFromArray = (arrayField: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [arrayField]: (prev[arrayField as keyof typeof prev] as string[]).filter((_, i) => i !== index),
    }));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addToArray('skills', 'skillInput');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Job title is required');
      return;
    }

    if (!formData.job_description.trim()) {
      setError('Job description is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData = {
        title: formData.title,
        job_description: formData.job_description,
        employment_type: formData.employment_type,
        status: formData.status,
        job_mode: formData.job_mode,
        skills: formData.skills,
        location: formData.location,
        experience_level: formData.experience_level,
      };

      await dispatch(updateJob({
        profileId,
        jobId: job.id,
        jobData: updateData
      })).unwrap();

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 1500);

    } catch (err: unknown) {
      console.error('Failed to update job:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update job. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Edit Job Posting
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Update your job posting details
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Success Message */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-300">Job updated successfully!</span>
                  </div>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-red-700 dark:text-red-300">{error}</span>
                  </div>
                </motion.div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="title" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Job Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="employment_type" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Employment Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="employment_type"
                    value={formData.employment_type}
                    onChange={(e) => handleInputChange('employment_type', e.target.value)}
                    className="mt-1 w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    required
                  >
                    {jobTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Job Status <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="mt-1 w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    required
                  >
                    {jobStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="job_mode" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Work Mode <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="job_mode"
                    value={formData.job_mode}
                    onChange={(e) => handleInputChange('job_mode', e.target.value)}
                    className="mt-1 w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    required
                  >
                    {jobModeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Job Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Job Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="description"
                  value={formData.job_description}
                  onChange={(e) => handleInputChange('job_description', e.target.value)}
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  rows={4}
                  className="mt-1 w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Location
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
                  <Input
                    placeholder="City"
                    value={formData.location.city}
                    onChange={(e) => handleNestedInputChange('location', 'city', e.target.value)}
                  />
                  <Input
                    placeholder="State"
                    value={formData.location.state}
                    onChange={(e) => handleNestedInputChange('location', 'state', e.target.value)}
                  />
                  <Input
                    placeholder="Country"
                    value={formData.location.country}
                    onChange={(e) => handleNestedInputChange('location', 'country', e.target.value)}
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                <Label htmlFor="skills" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Required Skills
                </Label>
                <div className="mt-1 space-y-2">
                  <Input
                    id="skills"
                    value={formData.skillInput}
                    onChange={(e) => handleInputChange('skillInput', e.target.value)}
                    onKeyPress={handleSkillKeyPress}
                    placeholder="Type a skill and press Enter or comma to add"
                  />
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeFromArray('skills', index)}
                            className="text-purple-500 hover:text-purple-700 ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Job'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}