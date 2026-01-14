"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Clock,
  Building2,
  Mail,
  Share2,
  Bookmark,
  BookmarkPlus,
  Loader2,
  AlertCircle,
  Briefcase,
  CheckCircle,
  Globe,
  Phone,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchSingleJob } from "@/store/slices/jobsSlice";
import { fetchUserBusinessProfiles, setSelectedProfile } from "@/store/slices/businessProfileSlice";
import { fetchMyApplications } from "@/store/slices/applicationsSlice";
import { ApplyJobModal } from "@/components/jobs/ApplyJobModal";
import { useApplicationStatus } from "@/hooks/useApplicationStatus";
import { useAppSelector } from "@/store/hooks";
import type { JobPosting, JobType, WorkLocation, MyApplication, JobApplication } from "@/types/jobs";
import type { RootState, AppDispatch } from "@/store";

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

const getWorkLocationIcon = (workLocation: WorkLocation) => {
  switch (workLocation) {
    case 'remote':
      return '🏠';
    case 'hybrid':
      return '🔄';
    case 'onsite':
    default:
      return '🏢';
  }
};

const formatSalary = (salaryRange?: { min: number; max: number; currency: string }) => {
  if (!salaryRange) return null;
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: salaryRange.currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  return `${formatter.format(salaryRange.min)} - ${formatter.format(salaryRange.max)}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  
  return formatDate(dateString);
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  
  const { currentJob: job, loading, error } = useSelector((state: RootState) => state.jobs);
  const { selectedProfile: businessProfile } = useSelector((state: RootState) => state.businessProfile);
  const { user } = useSelector((state: RootState) => state.auth);
  const { myApplications } = useAppSelector((state) => state.applications);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<{ applicationId: string; appliedAt: string } | null>(null);
  const [checkingApplication, setCheckingApplication] = useState(true);
  
  const jobId = params.jobId as string;
  const profileId = searchParams.get('profileId');

  useEffect(() => {
    if (jobId && profileId && job?.id !== jobId) {
      dispatch(fetchSingleJob({
        profileId,
        jobId
      }));
    }

    if (profileId && (!businessProfile || businessProfile.profileId !== profileId)) {
      dispatch(fetchUserBusinessProfiles({ includeInactive: true }))
        .unwrap()
        .then((profiles) => {
          const currentProfile = profiles.find((profile: { profileId: string }) => profile.profileId === profileId);
          if (currentProfile) {
            dispatch(setSelectedProfile(currentProfile));
          }
        })
        .catch((error) => {
          console.error('Failed to fetch business profile:', error);
        });
    }
  }, [dispatch, jobId, profileId, job?.id, businessProfile]);

  useEffect(() => {
    if (user?.id && job?.id) {
      setCheckingApplication(true);
      const checkApplicationStatus = () => {
        const application = myApplications.find((app) => {
          const appJobId = app.jobId;
          const jobObjectId = app.job?.id;
          const currentJobId = job.id;
          return appJobId === currentJobId || jobObjectId === currentJobId;
        });
        if (application && application.applicationId) {
          setHasApplied(true);
          setCurrentApplication({
            applicationId: application.applicationId,
            appliedAt: application.appliedAt,
          });
        } else {
          setHasApplied(false);
          setCurrentApplication(null);
        }
        setCheckingApplication(false);
      };

      if (myApplications.length === 0) {
        dispatch(fetchMyApplications({}))
          .unwrap()
          .then(() => {
            setTimeout(() => {
              checkApplicationStatus();
            }, 100);
          })
          .catch((error) => {
            console.error('Failed to fetch applications:', error);
            setHasApplied(false);
            setCurrentApplication(null);
            setCheckingApplication(false);
          });
      } else {
        checkApplicationStatus();
      }
    } else {
      setHasApplied(false);
      setCurrentApplication(null);
      setCheckingApplication(false);
    }
  }, [dispatch, user?.id, job?.id, myApplications]);

  const handleApplyClick = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!job?.id) return;

    if (hasApplied && currentApplication?.applicationId) {
      router.push(`/applications/${currentApplication.applicationId}`);
      return;
    }

    setCheckingStatus(true);
    try {
      if (myApplications.length === 0) {
        await dispatch(fetchMyApplications({})).unwrap();
      }
      const application = myApplications.find((app) => {
        const appJobId = app.jobId;
        const jobObjectId = app.job?.id;
        const currentJobId = job.id;
        return appJobId === currentJobId || jobObjectId === currentJobId;
      });
      if (application && application.applicationId) {
        setCheckingStatus(false);
        setHasApplied(true);
        setCurrentApplication({
          applicationId: application.applicationId,
          appliedAt: application.appliedAt,
        });
        router.push(`/applications/${application.applicationId}`);
        return;
      }
    } catch (error) {
      console.error('Error checking application status:', error);
    } finally {
      setCheckingStatus(false);
    }

    setShowApplyModal(true);
  };

  const renderApplyButton = () => {
    if (!user) {
      return (
        <Button
          onClick={() => router.push('/login')}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-medium"
        >
          Login to Apply
        </Button>
      );
    }

    if (!job) return null;

    if (job.status !== 'active') {
      return (
        <div className="space-y-2">
          <Button
            disabled
            className="w-full bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 py-3 text-lg font-medium cursor-not-allowed"
          >
            Application Closed
          </Button>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
            This job is no longer accepting applications
          </p>
        </div>
      );
    }

    if (checkingApplication || checkingStatus) {
      return (
        <Button
          disabled
          className="w-full bg-purple-600 text-white py-3 text-lg font-medium"
        >
          <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
          Checking...
        </Button>
      );
    }

    if (hasApplied && currentApplication && currentApplication.applicationId) {
      const appliedDate = new Date(currentApplication.appliedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Applied on {appliedDate}
            </span>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/applications/${currentApplication.applicationId}`)}
          >
            View Application
          </Button>
        </div>
      );
    }

    return (
      <Button
        onClick={handleApplyClick}
        disabled={checkingStatus}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-medium"
      >
        Apply for this Job
      </Button>
    );
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark logic
  };

  const handleShare = () => {
    if (navigator.share && job) {
      navigator.share({
        title: job.title,
        text: `Check out this job opportunity: ${job.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShareMenu(false);
    }
  };

  const handleViewCompany = () => {
    if (job?.profileId || job?.company_id) {
      router.push(`/businesses/${job.profileId || job.company_id}`);
    }
  };

  const companyData = businessProfile?.companyProfileData;
  const companyName = businessProfile?.businessName || businessProfile?.profileName || companyData?.companyName || job?.company_name || 'Company Name';

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job || !profileId) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Job Not Found
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {error || (!profileId ? 'Missing profile information.' : 'The job you are looking for could not be found.')}
          </p>
          <Button
            onClick={() => router.push('/businesses')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse Companies
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                    {job.title}
                  </h1>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                    {companyName}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {typeof job.location === 'string' ? job.location : 
                         typeof job.location === 'object' && job.location?.city ? 
                         `${job.location.city}, ${job.location.state}` : 'Location not specified'}
                      </span>
                      <span className="ml-1">{getWorkLocationIcon(job.job_mode ||  'remote')}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Posted {formatRelativeDate(job.createdAt || job.created_at)}</span>
                    </div>

                    

                    
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBookmark}
                    className={`${isBookmarked ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' : ''}`}
                  >
                    {/* {isBookmarked ? <Bookmark className="h-4 w-4 fill-current" /> : <BookmarkPlus className="h-4 w-4" />} */}
                  </Button>
                  
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowShareMenu(!showShareMenu)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    
                    {showShareMenu && (
                      <div className="absolute top-full right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-2 z-10">
                        <button
                          onClick={handleShare}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                        >
                          Copy Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getJobTypeColor(job.employment_type || job.jobType)}`}>
                  {(job.employment_type || job.jobType)?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  {(job.experienceLevel || 'Mid')?.replace(/\b\w/g, l => l.toUpperCase())} Level
                </span>
                
              </div>
            </motion.div>

            {/* Job Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700"
            >
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                Job Description
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                  {job.job_description || job.description || 'No description available.'}
                </p>
              </div>
            </motion.div>



            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700"
              >
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700"
            >
              {renderApplyButton()}
            </motion.div>

            {/* Company Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700"
            >
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                About the Company
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-neutral-400" />
                  <span className="text-neutral-700 dark:text-neutral-300">{companyName}</span>
                </div>
                
                <Button
                  variant="outline"
                  onClick={handleViewCompany}
                  className="w-full flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Company Profile
                </Button>
              </div>
            </motion.div>

            {/* Job Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700"
            >
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Job Statistics
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Posted</span>
                  <span className="text-neutral-900 dark:text-white font-medium">
                    {formatRelativeDate(job.createdAt || job.created_at)}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {job && (
        <ApplyJobModal
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          jobId={job.id}
          jobTitle={job.title}
        />
      )}
    </div>
  );
}