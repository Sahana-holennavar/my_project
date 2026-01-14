"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJobs } from "@/store/slices/jobsSlice";
import type { JobPosting, JobType, WorkLocation, ExperienceLevel } from "@/types/jobs";
import type { BusinessProfile } from "@/types/auth";
import type { RootState, AppDispatch } from "@/store";

interface BusinessJobsSectionProps {
  businessProfile: BusinessProfile | null;
  isLoading?: boolean;
  error?: string | null;
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
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export const BusinessJobsSection: React.FC<BusinessJobsSectionProps> = ({
  businessProfile,
  isLoading = false,
  error = null,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { jobs, loading } = useSelector((state: RootState) => state.jobs);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreJobs, setHasMoreJobs] = useState(false);

  // Fetch jobs when component mounts or when businessProfile changes
  useEffect(() => {
    if (businessProfile?.profileId) {
      dispatch(fetchJobs({
        profileId: businessProfile.profileId,
        params: {
          page: 1,
          limit: 6,
          status: 'active'
        }
      }));
    }
  }, [businessProfile?.profileId, dispatch]);

  // Filter only active jobs for public view
  const activeJobs = jobs.filter(job => job.status === 'active');

  // Navigation handlers
  const handleJobClick = (job: JobPosting) => {
    router.push(`/jobs/${job.id}?profileId=${businessProfile?.profileId}`);
  };

  const handleViewAllJobs = () => {
    if (businessProfile?.profileId) {
      router.push(`/businesses/${businessProfile.profileId}/jobs`);
    }
  };

  // Filter jobs based on search term and filter type
  const filteredJobs = activeJobs.filter(job => {
    const jobLocation = typeof job.location === 'string' ? job.location : 
                       typeof job.location === 'object' && job.location?.city ? 
                       `${job.location.city}, ${job.location.state}` : 'Not specified';
    
    const matchesSearch = searchTerm === "" || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || (job.employment_type || job.jobType) === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading || loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-8"
      >
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
            <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-32"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-3"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
                  <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-8"
      >
        <div className="text-center py-8">
          <Briefcase className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </motion.div>
    );
  }

  if (activeJobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Open Positions
          </h2>
        </div>
        <div className="text-center py-8">
          <Briefcase className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No Open Positions
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            There are currently no job openings at this company.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              Jobs
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {activeJobs.length} {activeJobs.length === 1 ? 'position' : 'positions'} available
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      {activeJobs.length > 3 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search positions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
            <option value="temporary">Temporary</option>
          </select>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.slice(0, 3).map((job) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
            onClick={() => handleJobClick(job)}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {job.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                
                {job.department && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    {job.department}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {typeof job.location === 'string' ? job.location : 
                       typeof job.location === 'object' && job.location?.city ? 
                       `${job.location.city}, ${job.location.state}` : 'Not specified'}
                    </span>
                    <span className="ml-1">{getWorkLocationIcon(job.job_mode ||  'remote')}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <Clock className="h-4 w-4" />
                    <span>{job.createdAt ? formatDate(job.createdAt) : formatDate(job.created_at)}</span>
                  </div>

                  {/* <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <Users className="h-4 w-4" />
                    <span>{job.applicationsCount} applicants</span>
                  </div> */}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor(job.employment_type || job.jobType)}`}>
                    {(job.employment_type || job.jobType).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    {(job.experienceLevel || 'Mid').replace(/\b\w/g, l => l.toUpperCase())} Level
                  </span>
                  {/* {job.applicationDeadline && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires {formatDate(job.applicationDeadline)}
                    </span>
                  )} */}
                </div>

                {/* Skills */}
                {job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 4).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 4 && (
                      <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400 rounded-md">
                        +{job.skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {/* <Bookmark className="h-4 w-4" /> */}
                </Button>
                <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Show All Jobs Button */}
      {activeJobs.length > 3 && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
            onClick={handleViewAllJobs}
          >
            View All {activeJobs.length} Positions
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};