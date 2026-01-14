'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, FileText, User, Briefcase, MapPin, Clock, Building2, Filter, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { env } from '@/lib/env';
import { tokenStorage } from '@/lib/tokens';

type SearchUser = {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  headline?: string;
  location?: string;
};

type SearchResponse = {
  status: number;
  message: string;
  success: boolean;
  data: {
    results: SearchUser[];
    page: number;
    limit: number;
    has_more: boolean;
    total_candidates: number;
  };
};

type JobLocation = {
  city: string;
  state: string;
  country: string;
};

type ExperienceLevel = {
  min: number;
  max: number;
};

type SearchJob = {
  id: string;
  title: string;
  job_description: string;
  employment_type: string;
  skills: string[];
  created_at: string;
  updated_at: string;
  status: string;
  job_mode: string;
  location: JobLocation;
  experience_level: ExperienceLevel;
  company_id: string;
  created_by_id: string;
  company_name: string;
  company_logo?: string;
};

type JobSearchResponse = {
  status: number;
  message: string;
  success: boolean;
  data: {
    jobs: SearchJob[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
    filters_applied: Record<string, string>;
  };
};

type SearchType = 'users' | 'jobs';

type JobFilters = {
  job_mode: string;
  location: string;
  employment_type: string;
  experience_min: string;
  experience_max: string;
  skills: string;
};

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const typeParam = searchParams?.get('type') as SearchType || 'users';
  
  const [searchType, setSearchType] = useState<SearchType>(typeParam);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [jobs, setJobs] = useState<SearchJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<JobFilters>({
    job_mode: '',
    location: '',
    employment_type: '',
    experience_min: '',
    experience_max: '',
    skills: '',
  });

  // Search users
  const searchUsers = async (query: string, pageNum: number = 1) => {
    if (!query.trim()) return;
    
    setIsLoading(true); 
    setError(null);
    
    try {
      const tokens = tokenStorage.getStoredTokens();
      if (!tokens?.access_token) {
        setError('Please login to search');
        return;
      }

      const offset = (pageNum - 1) * limit;
      const url = `${env.API_URL}/profile/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
      console.log('[Search] Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Search] Response status:', response.status);
      
      const data = await response.json();
      console.log('[Search] Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        // Use the correct field names from API response
        const users = data.data?.results || [];
        const total = data.data?.total_candidates || users.length;
        
        console.log('[Search] Found users:', users.length, 'Total:', total);
        
        setUsers(users);
        setTotal(total);
      } else {
        setError(data.message || 'Search failed');
      }
    } catch (err) {
      console.error('[Search] Error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Search jobs
  const searchJobs = async (query: string, pageNum: number = 1, jobFilters?: JobFilters) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tokens = tokenStorage.getStoredTokens();
      if (!tokens?.access_token) {
        setError('Please login to search');
        return;
      }

      // Build query params - using title as main search param
      const params: Record<string, string> = {
        title: query,
        page: pageNum.toString(),
        limit: limit.toString(),
      };
      
      // Add filters if provided
      const currentFilters = jobFilters || filters;
      if (currentFilters.job_mode) params.job_mode = currentFilters.job_mode;
      if (currentFilters.location) params.location = currentFilters.location;
      if (currentFilters.employment_type) params.employment_type = currentFilters.employment_type;
      if (currentFilters.experience_min) params.experience_min = currentFilters.experience_min;
      if (currentFilters.experience_max) params.experience_max = currentFilters.experience_max;
      if (currentFilters.skills) params.skills = currentFilters.skills;
      
      const queryString = new URLSearchParams(params).toString();
      const url = `${env.API_URL}/jobs/search?${queryString}`;
      console.log('[Job Search] Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Job Search] Response status:', response.status);
      
      const data: JobSearchResponse = await response.json();
      console.log('[Job Search] Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        const jobs = data.data?.jobs || [];
        const total = data.data?.pagination?.total || jobs.length;
        
        console.log('[Job Search] Found jobs:', jobs.length, 'Total:', total);
        
        setJobs(jobs);
        setTotal(total);
      } else {
        setError(data.message || 'Job search failed');
      }
    } catch (err) {
      console.error('[Job Search] Error:', err);
      setError(err instanceof Error ? err.message : 'Job search failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Search on mount if query exists
  useEffect(() => {
    if (queryParam) {
      if (searchType === 'users') {
        searchUsers(queryParam, 1);
      } else {
        searchJobs(queryParam, 1);
      }
    }
  }, [queryParam, searchType]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
      if (searchType === 'users') {
        searchUsers(searchQuery, 1);
      } else {
        searchJobs(searchQuery, 1);
      }
      setPage(1);
    }
  };

  // Handle search type change
  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    setUsers([]);
    setJobs([]);
    setTotal(0);
    setError(null);
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&type=${type}`);
      if (type === 'users') {
        searchUsers(searchQuery, 1);
      } else {
        searchJobs(searchQuery, 1);
      }
    }
  };

  // Handle filter change
  const handleFilterChange = (key: keyof JobFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    if (searchQuery.trim()) {
      searchJobs(searchQuery, 1, filters);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    const clearedFilters: JobFilters = {
      job_mode: '',
      location: '',
      employment_type: '',
      experience_min: '',
      experience_max: '',
      skills: '',
    };
    setFilters(clearedFilters);
    if (searchQuery.trim()) {
      searchJobs(searchQuery, 1, clearedFilters);
    }
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  // Handle search posts redirect
  const handleSearchPosts = () => {
    if (searchQuery.trim()) {
      router.push(`/feed?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // User initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  // Format location
  const formatLocation = (location: JobLocation) => {
    return `${location.city}, ${location.state}, ${location.country}`;
  };

  // Format employment type
  const formatEmploymentType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Format job mode
  const formatJobMode = (mode: string) => {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };

  return (
    <div className="min-h-screen bg-brand-gray-50 dark:bg-neutral-950 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-gray-900 dark:text-white mb-2">
            Search {searchType === 'users' ? 'Users' : 'Jobs'}
          </h1>
          <p className="text-brand-gray-600 dark:text-neutral-400">
            {searchType === 'users' 
              ? 'Find professionals and students in your network'
              : 'Discover job opportunities that match your skills'
            }
          </p>
        </div>

        {/* Search Type Toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => handleSearchTypeChange('users')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
              searchType === 'users'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white dark:bg-neutral-900 text-brand-gray-600 dark:text-neutral-400 border border-brand-gray-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-700'
            }`}
          >
            <User className="inline h-4 w-4 mr-2" />
            Users
          </button>
          <button
            onClick={() => handleSearchTypeChange('jobs')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
              searchType === 'jobs'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white dark:bg-neutral-900 text-brand-gray-600 dark:text-neutral-400 border border-brand-gray-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-700'
            }`}
          >
            <Briefcase className="inline h-4 w-4 mr-2" />
            Jobs
          </button>
        </div>

        {/* Filter Toggle Button - Only show for jobs */}
        {searchType === 'jobs' && (
          <div className="mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-xl text-brand-gray-700 dark:text-neutral-300 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
            >
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {getActiveFiltersCount() > 0 && (
                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full">
                  {getActiveFiltersCount()}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}

        {/* Filters Panel */}
        <AnimatePresence>
          {searchType === 'jobs' && showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Job Mode Filter */}
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-2">
                      Job Mode
                    </label>
                    <select
                      value={filters.job_mode}
                      onChange={(e) => handleFilterChange('job_mode', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg text-brand-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    >
                      <option value="">All Modes</option>
                      <option value="remote">Remote</option>
                      <option value="onsite">Onsite</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  {/* Employment Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-2">
                      Employment Type
                    </label>
                    <select
                      value={filters.employment_type}
                      onChange={(e) => handleFilterChange('employment_type', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg text-brand-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    >
                      <option value="">All Types</option>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      placeholder="e.g., Pune, Mumbai, India"
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg text-brand-gray-900 dark:text-white placeholder:text-brand-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    />
                  </div>

                  {/* Skills Filter */}
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-2">
                      Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={filters.skills}
                      onChange={(e) => handleFilterChange('skills', e.target.value)}
                      placeholder="e.g., JavaScript, React, Node.js"
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg text-brand-gray-900 dark:text-white placeholder:text-brand-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    />
                  </div>

                  {/* Experience Min Filter */}
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-2">
                      Min Experience (years)
                    </label>
                    <input
                      type="number"
                      value={filters.experience_min}
                      onChange={(e) => handleFilterChange('experience_min', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg text-brand-gray-900 dark:text-white placeholder:text-brand-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    />
                  </div>

                  {/* Experience Max Filter */}
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-2">
                      Max Experience (years)
                    </label>
                    <input
                      type="number"
                      value={filters.experience_max}
                      onChange={(e) => handleFilterChange('experience_max', e.target.value)}
                      placeholder="10"
                      min="0"
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg text-brand-gray-900 dark:text-white placeholder:text-brand-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex gap-3 pt-4 border-t border-brand-gray-200 dark:border-neutral-800">
                  <button
                    onClick={handleApplyFilters}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 text-brand-gray-700 dark:text-neutral-300 rounded-lg font-medium hover:bg-brand-gray-50 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-gray-400 dark:text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchType === 'users' 
                  ? 'Search by name, email, or profession...'
                  : 'Search by job title, skills, or location...'
              }
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-xl text-brand-gray-900 dark:text-white placeholder:text-brand-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-brand-gray-300 dark:disabled:bg-neutral-700 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Active Filters Display */}
        {searchType === 'jobs' && getActiveFiltersCount() > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-brand-gray-600 dark:text-neutral-400">
                Active Filters:
              </span>
              {filters.job_mode && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-lg">
                  <span className="font-medium">Mode:</span> {formatJobMode(filters.job_mode)}
                  <button
                    onClick={() => handleFilterChange('job_mode', '')}
                    className="hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.employment_type && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-lg">
                  <span className="font-medium">Type:</span> {formatEmploymentType(filters.employment_type)}
                  <button
                    onClick={() => handleFilterChange('employment_type', '')}
                    className="hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.location && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-lg">
                  <span className="font-medium">Location:</span> {filters.location}
                  <button
                    onClick={() => handleFilterChange('location', '')}
                    className="hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.skills && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-lg">
                  <span className="font-medium">Skills:</span> {filters.skills}
                  <button
                    onClick={() => handleFilterChange('skills', '')}
                    className="hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {(filters.experience_min || filters.experience_max) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-lg">
                  <span className="font-medium">Experience:</span> 
                  {filters.experience_min || '0'} - {filters.experience_max || '∞'} years
                  <button
                    onClick={() => {
                      handleFilterChange('experience_min', '');
                      handleFilterChange('experience_max', '');
                    }}
                    className="hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={handleClearFilters}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && searchType === 'users' && users.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-brand-gray-600 dark:text-neutral-400 mb-4">
              Found {total} {total === 1 ? 'user' : 'users'}
            </p>
            
            <div className="space-y-3">
              <AnimatePresence>
                {users.map((user) => (
                  <motion.div
                    key={user.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push(`/user/${user.user_id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center overflow-hidden shrink-0 w-16 h-16">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={`${user.first_name} ${user.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-xl">
                            {getInitials(user.first_name, user.last_name)}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-brand-gray-900 dark:text-white truncate">
                          {user.first_name} {user.last_name}
                        </h3>
                        {user.headline && (
                          <p className="text-sm text-brand-gray-600 dark:text-neutral-400 truncate">
                            {user.headline}
                          </p>
                        )}
                        {user.location && (
                          <p className="text-xs text-brand-gray-500 dark:text-neutral-500 mt-1">
                            {user.location}
                          </p>
                        )}
                      </div>

                      {/* View Profile Button */}
                      <button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/user/${user.user_id}`);
                        }}
                      >
                        <User className="h-5 w-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Job Results */}
        {!isLoading && searchType === 'jobs' && jobs.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-brand-gray-600 dark:text-neutral-400 mb-4">
              Found {total} {total === 1 ? 'job' : 'jobs'}
            </p>
            
            <div className="space-y-3">
              <AnimatePresence>
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push(`/jobs/${job.id}?profileId=${job.company_id}`)}
                  >
                    <div className="flex gap-4">
                      {/* Company Logo */}
                      <div className="relative rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center overflow-hidden shrink-0 w-14 h-14">
                        {job.company_logo ? (
                          <img
                            src={job.company_logo}
                            alt={job.company_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-7 w-7 text-white" />
                        )}
                      </div>

                      {/* Job Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-brand-gray-900 dark:text-white mb-1">
                          {job.title}
                        </h3>
                        <p className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-2">
                          {job.company_name}
                        </p>
                        
                        {/* Job Details */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-brand-gray-600 dark:text-neutral-400 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{formatLocation(job.location)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{formatEmploymentType(job.employment_type)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatJobMode(job.job_mode)}</span>
                          </div>
                        </div>

                        {/* Skills */}
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {job.skills.slice(0, 5).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-lg"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 5 && (
                              <span className="px-2.5 py-1 bg-brand-gray-100 dark:bg-neutral-800 text-brand-gray-600 dark:text-neutral-400 text-xs font-medium rounded-lg">
                                +{job.skills.length - 5} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Experience Level */}
                        <p className="text-xs text-brand-gray-500 dark:text-neutral-500">
                          {job.experience_level.min} - {job.experience_level.max} years experience
                        </p>
                      </div>

                      {/* View Job Button */}
                      <button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors self-start"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/jobs/${job.id}?profileId=${job.company_id}`);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && ((searchType === 'users' && users.length === 0) || (searchType === 'jobs' && jobs.length === 0)) && searchQuery && !error && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-gray-100 dark:bg-neutral-800 rounded-full mb-4">
              {searchType === 'users' ? (
                <Search className="h-8 w-8 text-brand-gray-400 dark:text-neutral-500" />
              ) : (
                <Briefcase className="h-8 w-8 text-brand-gray-400 dark:text-neutral-500" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-brand-gray-900 dark:text-white mb-2">
              No {searchType} found
            </h3>
            <p className="text-brand-gray-600 dark:text-neutral-400">
              Try searching with different keywords
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-brand-gray-600 dark:text-neutral-400">
              Searching {searchType}...
            </p>
          </div>
        )}

        {/* Search Posts Button */}
        {searchQuery && (
          <div className="mt-8 pt-8 border-t border-brand-gray-200 dark:border-neutral-800">
            <div className="text-center">
              <p className="text-sm text-brand-gray-600 dark:text-neutral-400 mb-4">
                Looking for posts instead?
              </p>
              <button
                onClick={handleSearchPosts}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-neutral-900 border-2 border-purple-600 text-purple-600 dark:text-purple-400 rounded-xl font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <FileText className="h-5 w-5" />
                Search Posts with &ldquo;{searchQuery}&rdquo;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
