'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDispatch, useSelector } from 'react-redux';
import { createJob } from '@/store/slices/jobsSlice';
import { RootState, AppDispatch } from '@/store';
import { CreateJobPostingData, JobType, JobMode, JobStatus } from '@/types/jobs';

interface NewJobFormData {
  title: string;
  job_description: string;
  employment_type: JobType;
  job_mode: JobMode;
  location: {
    city: string;
    state: string;
    country: string;
  };
  experience_level: {
    min: number;
    max: number;
  };
  skills: string[];
  status: JobStatus;
}

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string; // Add profileId back
}

const initialFormData: NewJobFormData = {
  title: '',
  job_description: '',
  employment_type: 'full_time',
  job_mode: 'onsite',
  location: {
    city: '',
    state: '',
    country: ''
  },
  experience_level: {
    min: 1,
    max: 5
  },
  skills: [''],
  status: 'draft'
};

export default function CreateJobModal({ isOpen, onClose, profileId }: CreateJobModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.jobs);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<NewJobFormData>(initialFormData);

  const steps = [
    { id: 1, title: 'Basic Info', description: 'Job title and description' },
    { id: 2, title: 'Details', description: 'Location, type, and experience' },
    { id: 3, title: 'Skills', description: 'Required skills and competencies' }
  ];

  const handleInputChange = (field: keyof NewJobFormData, value: string | JobType | JobMode | JobStatus) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (field: keyof NewJobFormData['location'], value: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
  };

  const handleExperienceChange = (field: keyof NewJobFormData['experience_level'], value: number) => {
    setFormData(prev => ({
      ...prev,
      experience_level: {
        ...prev.experience_level,
        [field]: value
      }
    }));
  };

  const handleSkillsChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => i === index ? value : skill)
    }));
  };

  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, '']
    }));
  };

  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!(formData.title && formData.job_description);
      case 2:
        return !!(formData.location.city && formData.location.state && formData.location.country);
      case 3:
        return formData.skills.some(skill => skill.trim());
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    try {
      const submitData: CreateJobPostingData = {
        title: formData.title,
        job_description: formData.job_description,
        employment_type: formData.employment_type,
        job_mode: formData.job_mode,
        location: formData.location,
        experience_level: formData.experience_level,
        skills: formData.skills.filter(skill => skill.trim()),
        status: formData.status
      };

      await dispatch(createJob({ profileId, jobData: submitData })).unwrap();
      onClose();
      setFormData(initialFormData);
      setCurrentStep(1);
    } catch (err) {
      console.error('Failed to create job:', err);
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Create Job Posting
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1].description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 ${index < steps.length - 1 ? 'mr-4' : ''}`}
              >
                <div
                  className={`h-2 rounded-full ${
                    currentStep >= step.id
                      ? 'bg-blue-600'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
            {steps.map(step => (
              <span key={step.id}>{step.title}</span>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.job_description}
                    onChange={(e) => handleInputChange('job_description', e.target.value)}
                    placeholder="Describe the role, responsibilities, and what you're looking for..."
                    rows={6}
                  />
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employment Type</Label>
                    <Select
                      value={formData.employment_type}
                      onValueChange={(value: JobType) => handleInputChange('employment_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Work Mode</Label>
                    <Select
                      value={formData.job_mode}
                      onValueChange={(value: JobMode) => handleInputChange('job_mode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">On-Site</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Location *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      value={formData.location.city}
                      onChange={(e) => handleLocationChange('city', e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      value={formData.location.state}
                      onChange={(e) => handleLocationChange('state', e.target.value)}
                      placeholder="State"
                    />
                    <Input
                      value={formData.location.country}
                      onChange={(e) => handleLocationChange('country', e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Experience Level (Years)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="minExp" className="text-sm">Minimum</Label>
                      <Input
                        id="minExp"
                        type="number"
                        min="0"
                        max="20"
                        value={formData.experience_level.min}
                        onChange={(e) => handleExperienceChange('min', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxExp" className="text-sm">Maximum</Label>
                      <Input
                        id="maxExp"
                        type="number"
                        min="0"
                        max="20"
                        value={formData.experience_level.max}
                        onChange={(e) => handleExperienceChange('max', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Required Skills *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSkill}
                    >
                      Add Skill
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.skills.map((skill, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={skill}
                          onChange={(e) => handleSkillsChange(index, e.target.value)}
                          placeholder="Enter a required skill"
                        />
                        {formData.skills.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSkill(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentStep < steps.length ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, status: 'draft' }));
                    handleSubmit();
                  }}
                  disabled={loading || !canProceed()}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => {
                    setFormData(prev => ({ ...prev, status: 'active' }));
                    handleSubmit();
                  }}
                  disabled={loading || !canProceed()}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Publishing...' : 'Publish Job'}
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}