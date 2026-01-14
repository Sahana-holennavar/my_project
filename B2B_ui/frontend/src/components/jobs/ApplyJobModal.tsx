'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { applyForJob, clearError } from '@/store/slices/applicationsSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResumeUpload } from './ResumeUpload';
import { AdditionalInfoFields } from './AdditionalInfoFields';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import type { CreateJobApplicationData } from '@/types/jobs';

const applicationSchema = z.object({
  resume: z.instanceof(File, { message: 'Resume is required' }),
  phone: z.string().min(1, 'Phone number is required').regex(/^\+[1-9]\d{1,3}\d{6,14}$/, 'Phone number must be in the format +CCXXXXXXXXXX (e.g., +919876543210)'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  full_name: z.string().min(1, 'Full name is required').min(2, 'Full name must be at least 2 characters'),
  address: z.string().min(1, 'Address is required').min(5, 'Address must be at least 5 characters'),
  portfolioUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface ApplyJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
}

export function ApplyJobModal({ isOpen, onClose, jobId, jobTitle }: ApplyJobModalProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.profile);
  const { applying, error } = useAppSelector((state) => state.applications);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      phone: '',
      email: '',
      full_name: '',
      address: '',
      portfolioUrl: '',
      linkedinUrl: '',
      githubUrl: '',
    },
  });

  const resumeFile = watch('resume');
  const formValues = watch();
  const { loadFormData, clearFormData, saveFormData } = useFormPersistence(jobId, {
    phone: formValues.phone,
    email: formValues.email,
    full_name: formValues.full_name,
    address: formValues.address,
    portfolioUrl: formValues.portfolioUrl,
    linkedinUrl: formValues.linkedinUrl,
    githubUrl: formValues.githubUrl,
  });

  const autoFillUserData = useCallback(() => {
    if (user?.email) {
      setValue('email', user.email);
    }
    if (profile?.personal_information?.phone_number) {
      setValue('phone', profile.personal_information.phone_number);
    }
    if (profile?.personal_information?.first_name && profile?.personal_information?.last_name) {
      const fullName = `${profile.personal_information.first_name} ${profile.personal_information.last_name}`.trim();
      setValue('full_name', fullName);
    }
    if (profile?.personal_information?.city && profile?.personal_information?.state_province && profile?.personal_information?.country) {
      const address = `${profile.personal_information.city}, ${profile.personal_information.state_province}, ${profile.personal_information.country}`.trim();
      setValue('address', address);
    }
  }, [user?.email, profile?.personal_information, setValue]);

  useEffect(() => {
    if (isOpen) {
      dispatch(clearError());
      const savedData = loadFormData();
      if (savedData) {
        setValue('phone', savedData.phone || '');
        setValue('email', savedData.email || '');
        setValue('full_name', savedData.full_name || '');
        setValue('address', savedData.address || '');
        setValue('portfolioUrl', savedData.portfolioUrl || '');
        setValue('linkedinUrl', savedData.linkedinUrl || '');
        setValue('githubUrl', savedData.githubUrl || '');
      } else {
        autoFillUserData();
      }
    }
  }, [isOpen, loadFormData, setValue, autoFillUserData, dispatch]);

  useEffect(() => {
    if (formValues.phone || formValues.email || formValues.full_name || formValues.address || resumeFile) {
      setHasUnsavedChanges(true);
      saveFormData();
    }
  }, [formValues, resumeFile, saveFormData]);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    reset();
    setHasUnsavedChanges(false);
    setShowCancelConfirm(false);
    onClose();
  };

  const handleConfirmCancel = () => {
    clearFormData();
    handleClose();
  };

  const onSubmit = async (data: ApplicationFormData) => {
    if (!data.resume) {
      toast.error('Please upload your resume');
      return;
    }

    const applicationData: CreateJobApplicationData = {
      resume: data.resume,
      phone: data.phone,
      email: data.email,
      full_name: data.full_name,
      address: data.address,
      portfolioUrl: data.portfolioUrl || undefined,
      linkedinUrl: data.linkedinUrl || undefined,
      githubUrl: data.githubUrl || undefined,
    };

    try {
      await dispatch(applyForJob({ jobId, applicationData })).unwrap();
      clearFormData();
      toast.success('Application submitted successfully!');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application';
      if (errorMessage.includes('already applied')) {
        toast.error('You have already applied for this job');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Apply for {jobTitle}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto flex-1 pr-2">
            <div className="space-y-4">
              <ResumeUpload
                value={resumeFile || null}
                onChange={(file) => setValue('resume', file as File, { shouldValidate: true })}
                error={errors.resume?.message}
              />

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+919876543210"
                  {...register('phone')}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Format: +CCXXXXXXXXXX (e.g., +919876543210)</p>
                {errors.phone && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  {...register('full_name')}
                  className={errors.full_name ? 'border-red-500' : ''}
                />
                {errors.full_name && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="City, State, Country"
                  {...register('address')}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.address.message}</p>
                )}
              </div>

              <AdditionalInfoFields
                values={{
                  portfolioUrl: formValues.portfolioUrl,
                  linkedinUrl: formValues.linkedinUrl,
                  githubUrl: formValues.githubUrl,
                }}
                onChange={(values) => {
                  setValue('portfolioUrl', values.portfolioUrl || '');
                  setValue('linkedinUrl', values.linkedinUrl || '');
                  setValue('githubUrl', values.githubUrl || '');
                }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={applying}>
                Cancel
              </Button>
              <Button type="submit" disabled={applying}>
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showCancelConfirm && (
        <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard application?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Your progress will be lost.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCancelConfirm(false)}>
                Stay
              </Button>
              <Button type="button" variant="destructive" onClick={handleConfirmCancel}>
                Discard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

