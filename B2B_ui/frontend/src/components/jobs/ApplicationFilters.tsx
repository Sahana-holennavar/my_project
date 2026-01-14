import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ApplicationStatusType } from '@/types/jobs';

interface ApplicationFiltersProps {
  status: ApplicationStatusType | 'all';
  search: string;
  sort: 'newest' | 'oldest' | 'company';
  onStatusChange: (status: ApplicationStatusType | 'all') => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: 'newest' | 'oldest' | 'company') => void;
  onClearFilters: () => void;
  resultsCount?: number;
}

export const ApplicationFilters: React.FC<ApplicationFiltersProps> = ({
  status,
  search,
  sort,
  onStatusChange,
  onSearchChange,
  onSortChange,
  onClearFilters,
  resultsCount,
}) => {
  const hasActiveFilters = status !== 'all' || search !== '' || sort !== 'newest';

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          type="text"
          placeholder="Search by job title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Select value={status} onValueChange={(value) => onStatusChange(value as ApplicationStatusType | 'all')}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Applications</SelectItem>
          <SelectItem value="applied">Applied</SelectItem>
          <SelectItem value="selected">Selected</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(value) => onSortChange(value as 'newest' | 'oldest' | 'company')}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="company">Company Name</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="outline" onClick={onClearFilters} className="w-full sm:w-auto">
          Clear Filters
        </Button>
      )}

      {resultsCount !== undefined && (
        <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
          {resultsCount} {resultsCount === 1 ? 'application' : 'applications'}
        </div>
      )}
    </div>
  );
};

