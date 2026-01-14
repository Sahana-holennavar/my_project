"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Search,
  Filter,
  SlidersHorizontal,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJobs } from "@/store/slices/jobsSlice";
import type { JobPosting, JobType, WorkLocation } from "@/types/jobs";
import type { BusinessProfile } from "@/types/auth";
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

export default function AllJobsPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  const { jobs, loading, error } = useSelector((state: RootState) => state.jobs);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showFilters, setShowFilters] = useState(false);
  
  const profileId = params.profileId as string;

  // Load jobs when component mounts
  useEffect(() => {
    if (profileId) {
      dispatch(fetchJobs({
        profileId,
        params: {
          page: 1,
          limit: 50,
          status: 'active' // Only show active jobs on public page
        }
      }));
    }
  }, [profileId, dispatch]);

  // Filter only active jobs for public view
  const activeJobs = jobs.filter(job => job.status === 'active');

  // Apply filters and search
  const filteredJobs = activeJobs.filter(job => {
    const jobLocation = typeof job.location === 'string' ? job.location : 
                       typeof job.location === 'object' && job.location?.city ? 
                       `${job.location.city}, ${job.location.state}` : 'Not specified';
    
    const matchesSearch = searchTerm === "" || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.job_description || job.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || (job.employment_type || job.jobType) === filterType;
    const matchesLevel = filterLevel === "all" || job.experienceLevel === filterLevel;
    const matchesLocation = filterLocation === "all" || (job.job_mode ) === filterLocation;
    
    return matchesSearch && matchesType && matchesLevel && matchesLocation;
  });

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime();
      case 'oldest':
        return new Date(a.createdAt || a.created_at).getTime() - new Date(b.createdAt || b.created_at).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const handleJobClick = (job: JobPosting) => {
    router.push(`/jobs/${job.id}?profileId=${profileId}`);
  };

  const handleBackToProfile = () => {
    router.push(`/businesses/${profileId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Error Loading Jobs
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleBackToProfile}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
              </Button>
              
              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600"></div>
              
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  All Open Positions
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {sortedJobs.length} {sortedJobs.length === 1 ? 'position' : 'positions'} available
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:block ${showFilters ? 'block' : 'hidden'} space-y-6`}>
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
              <h2 className="font-semibold text-neutral-900 dark:text-white mb-4">Filters</h2>
              
              <div className="space-y-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Job Type */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Job Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Experience Level
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="all">All Levels</option>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="lead">Lead Level</option>
                  </select>
                </div>

                {/* Work Location */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Work Location
                  </label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="all">All Locations</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="salary_high">Salary (High-Low)</option>
                    <option value="salary_low">Salary (Low-High)</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterLevel("all");
                  setFilterLocation("all");
                  setSortBy("newest");
                }}
                className="w-full mt-4"
              >
                Clear All Filters
              </Button>
            </div>
          </div>

          {/* Jobs List */}
          <div className="lg:col-span-3">
            {sortedJobs.length === 0 ? (
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-8 border border-neutral-200 dark:border-neutral-700 text-center">
                <Briefcase className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                  No jobs found
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {searchTerm || filterType !== 'all' || filterLevel !== 'all' || filterLocation !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'This company has no open positions at the moment.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                    onClick={() => handleJobClick(job)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-neutral-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {job.title}
                          </h3>
                          <ExternalLink className="h-5 w-5 text-neutral-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100" />
                        </div>
                        
                        {job.department && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                            {job.department}
                          </p>
                        )}

                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                          {job.job_description || job.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {typeof job.location === 'string' ? job.location : 
                               typeof job.location === 'object' && job.location?.city ? 
                               `${job.location.city}, ${job.location.state}` : 'Not specified'}
                            </span>
                            <span className="ml-1">{getWorkLocationIcon(job.job_mode || 'remote')}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                            <Clock className="h-4 w-4" />
                            <span>{job.createdAt ? formatDate(job.createdAt) : formatDate(job.created_at)}</span>
                          </div>

                          
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor(job.employment_type || job.jobType)}`}>
                            {(job.employment_type || job.jobType).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            {(job.experienceLevel || 'Mid').replace(/\b\w/g, l => l.toUpperCase())} Level
                          </span>
                          
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}