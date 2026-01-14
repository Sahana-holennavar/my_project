'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMyApplications, setStatusFilter, setSearchFilter, setSortFilter, clearFilters } from '@/store/slices/applicationsSlice';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ApplicationCard } from '@/components/jobs/ApplicationCard';
import { ApplicationFilters } from '@/components/jobs/ApplicationFilters';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, AlertCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import type { ApplicationStatusType } from '@/types/jobs';

export default function MyApplicationsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { myApplications, loading, error, filters, pagination } = useAppSelector((state) => state.applications);
  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    const params: { status?: string; search?: string; sort?: string; page?: number; limit?: number } = {};
    if (filters.status !== 'all') {
      params.status = filters.status;
    }
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    if (filters.sort !== 'newest') {
      const sortMap: Record<string, string> = {
        newest: 'newest',
        oldest: 'oldest',
        company: 'company',
      };
      params.sort = sortMap[filters.sort] || 'newest';
    }
    params.page = pagination.page;
    params.limit = pagination.limit;

    dispatch(fetchMyApplications(params));
  }, [dispatch, filters.status, debouncedSearch, filters.sort, pagination.page, pagination.limit]);

  const handleViewDetails = useCallback((application: { applicationId: string; jobId: string; job?: { profileId?: string } }) => {
    router.push(`/applications/${application.applicationId}`);
  }, [router]);

  const handleStatusChange = useCallback((status: ApplicationStatusType | 'all') => {
    dispatch(setStatusFilter(status));
  }, [dispatch]);

  const handleSearchChange = useCallback((search: string) => {
    dispatch(setSearchFilter(search));
  }, [dispatch]);

  const handleSortChange = useCallback((sort: 'newest' | 'oldest' | 'company') => {
    dispatch(setSortFilter(sort));
  }, [dispatch]);

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading applications...</p>
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
            Error Loading Applications
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">{error}</p>
          <Button onClick={() => dispatch(fetchMyApplications({}))}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              My Applications
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Track your job applications and their status
            </p>
          </div>

          <ApplicationFilters
            status={filters.status}
            search={filters.search}
            sort={filters.sort}
            onStatusChange={handleStatusChange}
            onSearchChange={handleSearchChange}
            onSortChange={handleSortChange}
            onClearFilters={handleClearFilters}
            resultsCount={pagination.total}
          />

          {myApplications.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                No Applications Yet
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                You haven&apos;t applied to any jobs yet. Start exploring opportunities!
              </p>
              <Button onClick={() => router.push('/businesses')}>
                Browse Jobs
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {myApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onViewDetails={() => handleViewDetails(application)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

