'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateMyApplication, clearError } from '@/store/slices/applicationsSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResumeUpload } from './ResumeUpload';
import { AdditionalInfoFields } from './AdditionalInfoFields';
import { useFormDirty } from '@/hooks/useFormDirty';
import { uploadProfileImage } from '@/lib/api/profile';
import type { ApplicationDetails, UpdateApplicationData } from '@/types/jobs';

const editApplicationSchema = z.object({
  resume: z.any().optional(),
  phone: z.string().min(1, 'Phone number is required').regex(/^\+[1-9]\d{1,3}\d{6,14}$/, 'Phone number must be in the format +CCXXXXXXXXXX (e.g., +919876543210)'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  portfolioUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type EditApplicationFormData = z.infer<typeof editApplicationSchema>;

interface EditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationDetails;
}

export function EditApplicationModal({ isOpen, onClose, application }: EditApplicationModalProps) {
  const dispatch = useAppDispatch();
  const { updating, error } = useAppSelector((state) => state.applications);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(application.resume || null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<EditApplicationFormData>({
    resolver: zodResolver(editApplicationSchema),
    defaultValues: {
      phone: application.phone || '',
      email: application.email || '',
      portfolioUrl: application.additional_info?.portfolio || '',
      linkedinUrl: application.additional_info?.linkedin || '',
      githubUrl: application.additional_info?.github || '',
    },
  });

  const formValues = watch();
  const initialValues = {
    phone: application.phone || '',
    email: application.email || '',
    portfolioUrl: application.additional_info?.portfolio || '',
    linkedinUrl: application.additional_info?.linkedin || '',
    githubUrl: application.additional_info?.github || '',
  };

  const { isDirty, changedFields } = useFormDirty(formValues, initialValues);

  useEffect(() => {
    if (isOpen) {
      dispatch(clearError());
      reset({
        phone: application.phone || '',
        email: application.email || '',
        portfolioUrl: application.additional_info?.portfolio || '',
        linkedinUrl: application.additional_info?.linkedin || '',
        githubUrl: application.additional_info?.github || '',
      });
      setResumeUrl(application.resume || null);
      setResumeFile(null);
    }
  }, [isOpen, application, reset, dispatch]);

  const handleCancel = () => {
    if (isDirty || resumeFile) {
      setShowCancelConfirm(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    reset();
    setResumeFile(null);
    setShowCancelConfirm(false);
    onClose();
  };

  const handleConfirmCancel = () => {
    handleClose();
  };

  const handleResumeChange = (file: File | null) => {
    setResumeFile(file);
  };

  const onSubmit = async (data: EditApplicationFormData) => {
    if (application.status !== 'applied' && application.status !== 'pending') {
      toast.error('Cannot edit application after it has been reviewed');
      return;
    }

    const updateData: UpdateApplicationData = {};

    if (changedFields.includes('phone')) {
      updateData.phone = data.phone;
    }
    if (changedFields.includes('email')) {
      updateData.email = data.email;
    }
    if (resumeFile) {
      try {
        const uploadResult = await uploadProfileImage(resumeFile, 'resume');
        if (uploadResult.success && uploadResult.data) {
          const uploadData = uploadResult.data as Record<string, unknown>;
          const resumeData = uploadData.resume as Record<string, unknown> | undefined;
          const uploadedUrl =
            (resumeData?.fileUrl as string | undefined) ||
            (resumeData?.file_url as string | undefined) ||
            (uploadData?.resume_url as string | undefined) ||
            (uploadData?.fileUrl as string | undefined) ||
            (uploadData?.file_url as string | undefined) ||
            null;

          if (uploadedUrl) {
            updateData.resume = uploadedUrl;
          } else {
            toast.error('Failed to get resume URL after upload');
            return;
          }
        } else {
          toast.error(uploadResult.message || 'Failed to upload resume');
          return;
        }
      } catch (err) {
        toast.error('Failed to upload resume');
        return;
      }
    }

    const additionalInfo: { portfolio?: string; linkedin?: string; github?: string } = {};
    let hasAdditionalInfo = false;

    if (changedFields.includes('portfolioUrl') && data.portfolioUrl) {
      additionalInfo.portfolio = data.portfolioUrl;
      hasAdditionalInfo = true;
    }
    if (changedFields.includes('linkedinUrl') && data.linkedinUrl) {
      additionalInfo.linkedin = data.linkedinUrl;
      hasAdditionalInfo = true;
    }
    if (changedFields.includes('githubUrl') && data.githubUrl) {
      additionalInfo.github = data.githubUrl;
      hasAdditionalInfo = true;
    }

    if (hasAdditionalInfo) {
      updateData.additional_info = additionalInfo;
    }

    if (Object.keys(updateData).length === 0 && !resumeFile) {
      toast.info('No changes to save');
      return;
    }

    try {
      await dispatch(updateMyApplication({ applicationId: application.applicationId, updateData })).unwrap();
      toast.success('Application updated successfully!');
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application';
      if (errorMessage.includes('reviewed')) {
        toast.error('Cannot edit application after it has been reviewed');
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
            <DialogTitle>Edit Application</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto flex-1 pr-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resume">Resume</Label>
                {resumeUrl && !resumeFile && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg mb-2">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Current Resume:</p>
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      View Current Resume
                    </a>
                  </div>
                )}
                <ResumeUpload
                  value={resumeFile}
                  onChange={handleResumeChange}
                  error={errors.resume?.message as string | undefined}
                />
                {resumeFile && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    New resume will replace the current one
                  </p>
                )}
              </div>

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

              <AdditionalInfoFields
                values={{
                  portfolioUrl: formValues.portfolioUrl || '',
                  linkedinUrl: formValues.linkedinUrl || '',
                  githubUrl: formValues.githubUrl || '',
                }}
                onChange={(values) => {
                  setValue('portfolioUrl', values.portfolioUrl || '', { shouldValidate: true });
                  setValue('linkedinUrl', values.linkedinUrl || '', { shouldValidate: true });
                  setValue('githubUrl', values.githubUrl || '', { shouldValidate: true });
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
              <Button type="button" variant="outline" onClick={handleCancel} disabled={updating}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating || (!isDirty && !resumeFile)}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
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
              <DialogTitle>Discard changes?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              You have unsaved changes. Are you sure you want to discard them?
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

