'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchApplicationById, clearSelectedApplication, withdrawApplication, removeApplicationFromList, restoreApplication } from '@/store/slices/applicationsSlice';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ApplicationStatusBadge } from '@/components/jobs/ApplicationStatusBadge';
import { EditApplicationModal } from '@/components/jobs/EditApplicationModal';
import { WithdrawConfirmDialog } from '@/components/jobs/WithdrawConfirmDialog';
import { WithdrawActionButton } from '@/components/jobs/WithdrawActionButton';
import { useApplicationEdit } from '@/hooks/useApplicationEdit';
import { useWithdrawPermissions } from '@/hooks/useWithdrawPermissions';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ArrowLeft, Building2, Calendar, FileText, Mail, Phone, MapPin, ExternalLink, Edit, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Not available';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

export default function ApplicationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selectedApplication, loading, error } = useAppSelector((state) => state.applications);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const applicationId = params.applicationId as string;

  useEffect(() => {
    if (applicationId) {
      dispatch(fetchApplicationById(applicationId));
    }
    return () => {
      dispatch(clearSelectedApplication());
    };
  }, [dispatch, applicationId]);

  const { canEdit } = useApplicationEdit(selectedApplication);
  const { canWithdraw } = useWithdrawPermissions(selectedApplication);

  const handleWithdrawClick = () => {
    setShowWithdrawConfirm(true);
  };

  const handleWithdrawConfirm = async () => {
    if (!selectedApplication) return;

    const applicationToRestore = selectedApplication;
    dispatch(removeApplicationFromList(selectedApplication.applicationId));

    setWithdrawing(true);
    try {
      await dispatch(withdrawApplication(selectedApplication.applicationId)).unwrap();
      toast.success('Application withdrawn successfully');
      setShowWithdrawConfirm(false);
      router.push('/applications');
    } catch (error) {
      dispatch(restoreApplication(applicationToRestore as import('@/types/jobs').MyApplication));
      const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw application';
      toast.error(errorMessage);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleViewJob = () => {
    if (selectedApplication?.job?.id && selectedApplication?.job?.company_id) {
      router.push(`/jobs/${selectedApplication.job.id}?profileId=${selectedApplication.job.company_id}`);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">Loading application details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !selectedApplication) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Application Not Found
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {error || 'The application you are looking for could not be found.'}
            </p>
            <Button onClick={() => router.push('/applications')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/applications')}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Applications
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                  {selectedApplication.job?.title || 'Job Title'}
                </h1>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                  {selectedApplication.job?.companyName || 'Company Name'}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <ApplicationStatusBadge status={selectedApplication.status as 'applied' | 'selected' | 'rejected'} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button onClick={() => setShowEditModal(true)} variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Application
                  </Button>
                )}
                {canWithdraw && (
                  <WithdrawActionButton
                    application={selectedApplication}
                    onWithdraw={handleWithdrawClick}
                    loading={withdrawing}
                  />
                )}
                <Button onClick={handleViewJob} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Job
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">Application Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Applied Date</p>
                      <p className="text-neutral-900 dark:text-white">{formatDate(selectedApplication.appliedAt)}</p>
                    </div>
                  </div>
                  {selectedApplication.updatedAt && selectedApplication.updatedAt !== selectedApplication.appliedAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-neutral-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Last Updated</p>
                        <p className="text-neutral-900 dark:text-white">{formatDate(selectedApplication.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Phone Number</p>
                      <p className="text-neutral-900 dark:text-white">{selectedApplication.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Email</p>
                      <p className="text-neutral-900 dark:text-white">{selectedApplication.email || 'Not provided'}</p>
                    </div>
                  </div>
                  {selectedApplication.resume && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-neutral-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Resume</p>
                        <a
                          href={selectedApplication.resume}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          View Resume
                        </a>
                      </div>
                    </div>
                  )}
                  {(selectedApplication.additional_info?.portfolio || selectedApplication.additional_info?.linkedin || selectedApplication.additional_info?.github) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Additional Information</p>
                      {selectedApplication.additional_info?.portfolio && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-neutral-400" />
                          <a
                            href={selectedApplication.additional_info.portfolio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            Portfolio
                          </a>
                        </div>
                      )}
                      {selectedApplication.additional_info?.linkedin && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-neutral-400" />
                          <a
                            href={selectedApplication.additional_info.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                      {selectedApplication.additional_info?.github && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-neutral-400" />
                          <a
                            href={selectedApplication.additional_info.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            GitHub
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Job Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-neutral-400" />
                    <span className="text-neutral-700 dark:text-neutral-300">{selectedApplication.job?.companyName || 'Company Name'}</span>
                  </div>
                  {selectedApplication.job?.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-neutral-400" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {typeof selectedApplication.job.location === 'object'
                          ? `${selectedApplication.job.location.city}, ${selectedApplication.job.location.state}`
                          : selectedApplication.job.location}
                      </span>
                    </div>
                  )}
                  {selectedApplication.job?.employment_type && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-neutral-400" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {selectedApplication.job.employment_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedApplication && (
          <>
            <EditApplicationModal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                dispatch(fetchApplicationById(applicationId));
              }}
              application={selectedApplication}
            />
            <WithdrawConfirmDialog
              isOpen={showWithdrawConfirm}
              onClose={() => setShowWithdrawConfirm(false)}
              onConfirm={handleWithdrawConfirm}
              jobTitle={selectedApplication.job?.title || 'Job'}
              companyName={selectedApplication.job?.companyName}
              loading={withdrawing}
            />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

