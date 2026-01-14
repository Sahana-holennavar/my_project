"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Download,
  DownloadCloud,
  ExternalLink,
  Mail,
  Phone,
  User,
  Calendar,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchApplications,
  fetchApplicationStats,
  updateApplicationStatus,
  setSelectedApplication as setSelectedApp,
  setSearchTerm as setSearch,
  setStatusFilter as setStatus,
  setPage as setPageAction,
  clearApplications,
} from "@/store/slices/jobApplicationsSlice";
import type { JobApplication, ApplicationStatus } from "@/types/jobs";

export default function JobApplicationsPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params?.profileId as string;
  const jobId = params?.jobId as string;
  
  const dispatch = useAppDispatch();
  const {
    applications,
    selectedApplication,
    loading,
    statsLoading,
    error,
    pagination,
    jobInfo,
    stats,
    filters,
  } = useAppSelector((state) => state.jobApplications);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState<string | null>(null);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (profileId && jobId) {
      // Fetch applications with current filters
      const requestParams: {
        page: number;
        limit: number;
        status?: string;
      } = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.statusFilter !== "all") {
        requestParams.status = filters.statusFilter;
      }

      dispatch(fetchApplications({ profileId, jobId, params: requestParams }));
    }
  }, [profileId, jobId, pagination.page, filters.statusFilter, dispatch]);

  // Load stats once on mount
  useEffect(() => {
    if (profileId && jobId) {
      dispatch(fetchApplicationStats({ profileId, jobId }));
    }
  }, [profileId, jobId, dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearApplications());
    };
  }, [dispatch]);

  const handleGoBack = () => {
    router.push(`/businesses/${profileId}/dashboard`);
  };

  const handleViewApplication = (application: JobApplication) => {
    dispatch(setSelectedApp(application));
    setShowDetailModal(true);
  };
  
  const handleSearchChange = (value: string) => {
    dispatch(setSearch(value));
  };
  
  const handleStatusFilterChange = (value: string) => {
    dispatch(setStatus(value));
  };
  
  const handlePageChange = (newPage: number) => {
    dispatch(setPageAction(newPage));
  };
  
  const handleDownloadResume = async (resumeUrl: string, applicantName: string, applicationId: string) => {
    try {
      setDownloadingResume(applicationId);
      const response = await fetch(resumeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract file extension from URL or default to pdf
      const extension = resumeUrl.split('.').pop()?.split('?')[0] || 'pdf';
      link.download = `${applicantName.replace(/\s+/g, '_')}_Resume.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download resume:', error);
      alert('Failed to download resume. Please try again.');
    } finally {
      setDownloadingResume(null);
    }
  };
  
  const handleBulkDownload = async () => {
    try {
      setDownloadingBulk(true);
      
      // Get all applications with resumes from current filter
      const applicationsWithResumes = filteredApplications.filter(app => app.resume_url);
      
      if (applicationsWithResumes.length === 0) {
        alert('No resumes available to download.');
        return;
      }
      
      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Download all resumes and add to zip
      const downloadPromises = applicationsWithResumes.map(async (app, index) => {
        try {
          const response = await fetch(app.resume_url!);
          const blob = await response.blob();
          const extension = app.resume_url!.split('.').pop()?.split('?')[0] || 'pdf';
          const fileName = `${app.applicant.name.replace(/\s+/g, '_')}_Resume.${extension}`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download resume for ${app.applicant.name}:`, error);
        }
      });
      
      await Promise.all(downloadPromises);
      
      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${jobInfo.title.replace(/\s+/g, '_')}_Resumes_${new Date().toISOString().split('T')[0]}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download bulk resumes:', error);
      alert('Failed to download resumes. Please try again.');
    } finally {
      setDownloadingBulk(false);
    }
  };
  
  const handleStatusUpdate = async (applicationId: string, newStatus: 'selected' | 'rejected') => {
    try {
      setUpdatingStatus(applicationId);
      const result = await dispatch(updateApplicationStatus({
        profileId,
        jobId,
        applicationId,
        status: newStatus,
      })).unwrap();
      
      // Refresh stats after status update
      dispatch(fetchApplicationStats({ profileId, jobId }));
      
    } catch (error) {
      console.error('Failed to update application status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "applied":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
      case "selected":
        return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case "applied":
        return <Clock className="h-4 w-4" />;
      case "selected":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Filter applications by search term
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.applicant.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      app.phone.includes(filters.searchTerm);
    return matchesSearch;
  });

  if (loading && applications.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Failed to Load Applications
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">{error}</p>
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleGoBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Job Applications
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {jobInfo.title} • {jobInfo.totalApplications} total applications
                </p>
              </div>
            </div>
            
            {/* Bulk Download Button */}
            {filteredApplications.filter(app => app.resume_url).length > 1 && (
              <Button
                onClick={handleBulkDownload}
                disabled={downloadingBulk}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {downloadingBulk ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-4 w-4 mr-2" />
                    Download All Resumes ({filteredApplications.filter(app => app.resume_url).length})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Applications</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{jobInfo.totalApplications}</p>
              </div>
              <Briefcase className="h-8 w-8 text-neutral-400" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">New Applications</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.appliedCount}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Selected</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.selectedCount}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Rejected</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.rejectedCount}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filters.statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <User className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">
                {filters.searchTerm ? "No applications match your search" : "No applications yet"}
              </p>
            </div>
          ) : (
            filteredApplications.map((application) => (
              <motion.div
                key={application.id}
                layout
                className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {application.applicant.profile_picture ? (
                        <img
                          src={application.applicant.profile_picture}
                          alt={application.applicant.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        application.applicant.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {application.applicant.name}
                          </h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {application.applicant.user_type === "professional"
                              ? "Professional"
                              : "Student"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{application.email}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{application.phone}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(application.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(
                              application.status
                            )}`}
                          >
                            {getStatusIcon(application.status)}
                            {application.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewApplication(application)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>

                    {application.resume_url && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(application.resume_url, "_blank")}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadResume(application.resume_url!, application.applicant.name, application.id)}
                          disabled={downloadingResume === application.id}
                        >
                          {downloadingResume === application.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3 mr-1" />
                          )}
                          Download
                        </Button>
                      </>
                    )}
                    
                    {/* Status Action Buttons */}
                    {application.status === 'applied' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(application.id, 'selected')}
                          disabled={updatingStatus === application.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {updatingStatus === application.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <UserCheck className="h-3 w-3 mr-1" />
                          )}
                          Select
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(application.id, 'rejected')}
                          disabled={updatingStatus === application.id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {updatingStatus === application.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <UserX className="h-3 w-3 mr-1" />
                          )}
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {/* Allow rejecting selected candidates */}
                    {application.status === 'selected' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(application.id, 'rejected')}
                        disabled={updatingStatus === application.id}
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        {updatingStatus === application.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <UserX className="h-3 w-3 mr-1" />
                        )}
                        Reject
                      </Button>
                    )}
                    
                    {/* Allow selecting rejected candidates */}
                    {application.status === 'rejected' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(application.id, 'selected')}
                        disabled={updatingStatus === application.id}
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                      >
                        {updatingStatus === application.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <UserCheck className="h-3 w-3 mr-1" />
                        )}
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page === pagination.totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedApplication && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-xl">
                    {selectedApplication.applicant.profile_picture ? (
                      <img
                        src={selectedApplication.applicant.profile_picture}
                        alt={selectedApplication.applicant.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      selectedApplication.applicant.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 
                      className="text-2xl font-bold text-neutral-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors"
                      onClick={() => router.push(`/user/${selectedApplication.user_id}`)}
                    >
                      {selectedApplication.applicant.name}
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      {selectedApplication.applicant.user_type === "professional"
                        ? "Professional"
                        : "Student"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </Button>
              </div>

              {/* Status Badge */}
              <div className="mb-6">
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${getStatusColor(
                    selectedApplication.status
                  )}`}
                >
                  {getStatusIcon(selectedApplication.status)}
                  {selectedApplication.status.toUpperCase()}
                </span>
              </div>

              {/* Contact Information */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Mail className="h-4 w-4 text-neutral-400" />
                    <span>{selectedApplication.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Phone className="h-4 w-4 text-neutral-400" />
                    <span>{selectedApplication.phone}</span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {selectedApplication.additional_info && (
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Additional Information
                  </h3>
                  <div className="space-y-2">
                    {selectedApplication.additional_info.portfolio && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-neutral-400" />
                        <a
                          href={selectedApplication.additional_info.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Portfolio
                        </a>
                      </div>
                    )}
                    {selectedApplication.additional_info.linkedin && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-neutral-400" />
                        <a
                          href={selectedApplication.additional_info.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Application Details */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Application Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Applied On</p>
                    <p className="text-neutral-900 dark:text-white font-medium">
                      {new Date(selectedApplication.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Last Updated</p>
                    <p className="text-neutral-900 dark:text-white font-medium">
                      {new Date(selectedApplication.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resume */}
              {selectedApplication.resume_url && (
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Resume</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(selectedApplication.resume_url, "_blank")}
                      className="flex-1"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Resume
                    </Button>
                    <Button
                      onClick={() => handleDownloadResume(selectedApplication.resume_url!, selectedApplication.applicant.name, selectedApplication.id)}
                      disabled={downloadingResume === selectedApplication.id}
                      className="flex-1"
                    >
                      {downloadingResume === selectedApplication.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download Resume
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Action Buttons for Applied Status */}
              {selectedApplication.status === 'applied' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Actions</h3>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedApplication.id, 'selected');
                        setShowDetailModal(false);
                      }}
                      disabled={updatingStatus === selectedApplication.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {updatingStatus === selectedApplication.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Selecting...
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Select Candidate
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedApplication.id, 'rejected');
                        setShowDetailModal(false);
                      }}
                      disabled={updatingStatus === selectedApplication.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {updatingStatus === selectedApplication.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 mr-2" />
                          Reject Candidate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Action Button for Selected Status - Allow Rejection */}
              {selectedApplication.status === 'selected' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Change Decision</h3>
                  <Button
                    onClick={() => {
                      handleStatusUpdate(selectedApplication.id, 'rejected');
                      setShowDetailModal(false);
                    }}
                    disabled={updatingStatus === selectedApplication.id}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {updatingStatus === selectedApplication.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        Reject Candidate
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                    Change your decision and reject this selected candidate
                  </p>
                </div>
              )}
              
              {/* Action Button for Rejected Status - Allow Selection */}
              {selectedApplication.status === 'rejected' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Reconsider Decision</h3>
                  <Button
                    onClick={() => {
                      handleStatusUpdate(selectedApplication.id, 'selected');
                      setShowDetailModal(false);
                    }}
                    disabled={updatingStatus === selectedApplication.id}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updatingStatus === selectedApplication.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Selecting...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Select Candidate
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                    Reconsider and select this previously rejected candidate
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
