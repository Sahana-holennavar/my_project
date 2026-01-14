"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Users,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  FileText,
  MoreVertical,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJobs, deleteJob, toggleJobStatus } from "@/store/slices/jobsSlice";
import type { JobPosting, JobType, JobStatus } from "@/types/jobs";
import type { BusinessProfile } from "@/types/auth";
import type { RootState, AppDispatch } from "@/store";
import CreateJobModal from "./CreateJobModal";
import EditJobModal from "./EditJobModal";

interface JobManagementTabProps {
  businessProfile: BusinessProfile;
}

const getJobTypeColor = (type: JobType) => {
  switch (type) {
    case 'full_time':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'part_time':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

const getStatusColor = (status: JobStatus) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'inactive':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    case 'closed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'draft':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

const formatSalary = (salaryRange?: { min: number; max: number; currency: string }) => {
  if (!salaryRange) return 'Not specified';
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: salaryRange.currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  return `${formatter.format(salaryRange.min)} - ${formatter.format(salaryRange.max)}`;
};

export default function JobManagementTab({ businessProfile }: JobManagementTabProps) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { jobs, loading, error, summary } = useSelector((state: RootState) => state.jobs);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Loading states for actions
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // Success/Error states
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch jobs when component mounts
  useEffect(() => {
    loadJobs();
  }, [businessProfile.profileId, dispatch]);

  const loadJobs = async () => {
    try {
      await dispatch(fetchJobs({ 
        profileId: businessProfile.profileId,
        params: { page: 1, limit: 50 }
      })).unwrap();
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  const handleToggleJobStatus = async (job: JobPosting) => {
    if (!job.id) return;
    
    const newStatus: JobStatus = job.status === 'active' ? 'inactive' : 'active';
    setToggleLoading(job.id);
    
    try {
      await dispatch(toggleJobStatus({
        profileId: businessProfile.profileId,
        jobId: job.id,
        status: newStatus
      })).unwrap();
      
      setSuccess(`Job ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to toggle job status:', error);
    } finally {
      setToggleLoading(null);
    }
  };

  const handleDeleteJob = async () => {
    if (!selectedJob?.id) return;
    
    setDeleteLoading(selectedJob.id);
    
    try {
      await dispatch(deleteJob({
        profileId: businessProfile.profileId,
        jobId: selectedJob.id
      })).unwrap();
      
      setShowDeleteModal(false);
      setSelectedJob(null);
      setSuccess('Job deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to delete job:', error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleViewJob = (job: JobPosting) => {
    router.push(`/jobs/${job.id}?profileId=${businessProfile.profileId}`);
  };

  const handleViewApplications = (job: JobPosting) => {
    router.push(`/businesses/${businessProfile.profileId}/jobs/${job.id}/applications`);
  };

  const handleEditJob = (job: JobPosting) => {
    setSelectedJob(job);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedJob(null);
    // Reload jobs to get updated data
    loadJobs();
  };

  // Filter jobs based on search term and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.job_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesType = typeFilter === 'all' || job.employment_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              Job Management
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Manage your job postings
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Job
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/50 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300">{success}</span>
          </div>
        </motion.div>
      )}

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Jobs</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {summary.totalJobs}
              </p>
            </div>
            <Briefcase className="h-8 w-8 text-neutral-400" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.activeJobs}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Inactive</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {summary.inactiveJobs}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Drafts</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {summary.draftJobs}
              </p>
            </div>
            <FileText className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            <span className="ml-2 text-neutral-600 dark:text-neutral-400">Loading jobs...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No jobs match your filters'
                : 'No jobs posted yet'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
                variant="outline"
              >
                Create Your First Job
              </Button>
            )}
          </div>
        ) : (
          filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              layout
              className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 
                        className="text-lg font-semibold text-neutral-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors"
                        onClick={() => handleViewJob(job)}
                      >
                        {job.title}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                        {job.job_description || job.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor(job.employment_type || job.jobType!)}`}>
                        {job.employment_type?.replace('_', ' ')?.toUpperCase() || job.jobType?.replace('-', ' ')?.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {typeof job.location === 'object' && job.location.city 
                          ? `${job.location.city}, ${job.location.state}`
                          : typeof job.location === 'string' 
                            ? job.location 
                            : 'Location not specified'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>

                    {job.skills && job.skills.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs">Skills:</span>
                        <span className="text-xs font-medium">
                          {job.skills.slice(0, 3).join(', ')}
                          {job.skills.length > 3 && ` +${job.skills.length - 3} more`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewApplications(job)}
                    className="flex items-center gap-1"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Applications
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleJobStatus(job)}
                    disabled={!!toggleLoading}
                    className="flex items-center gap-1"
                  >
                    {toggleLoading === job.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : job.status === 'active' ? (
                      <ToggleRight className="h-3 w-3" />
                    ) : (
                      <ToggleLeft className="h-3 w-3" />
                    )}
                    {job.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewJob(job)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditJob(job)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedJob(job);
                      setShowDeleteModal(true);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        profileId={businessProfile.profileId}
        onClose={() => {
          setShowCreateModal(false);
          // Jobs will be refetched automatically by Redux when a new job is created
        }}
      />

      {/* Edit Job Modal */}
      {showEditModal && selectedJob && (
        <EditJobModal
          isOpen={showEditModal}
          job={selectedJob}
          profileId={businessProfile.profileId}
          onClose={handleCloseEditModal}
          onSuccess={() => {
            setSuccess('Job updated successfully');
            setTimeout(() => setSuccess(null), 3000);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Delete Job
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-neutral-700 dark:text-neutral-300 mb-6">
              Are you sure you want to delete the job posting &quot;{selectedJob.title}&quot;?
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedJob(null);
                }}
                disabled={!!deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteJob}
                disabled={!!deleteLoading}
                className="flex items-center gap-2"
              >
                {deleteLoading === selectedJob.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Job
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}