'use client';

import { Calendar, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import type { MyApplication } from '@/types/jobs';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface ApplicationCardProps {
  application: MyApplication;
  onViewDetails?: () => void;
}

export function ApplicationCard({ application, onViewDetails }: ApplicationCardProps) {
  const appliedDate = formatDate(application.appliedAt);

  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                {application.job?.title || 'Job Title'}
              </h3>
              {application.job?.companyName && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                  {application.job.companyName}
                </p>
              )}
            </div>
            <ApplicationStatusBadge status={application.status as 'applied' | 'selected' | 'rejected'} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Applied on {appliedDate}</span>
            </div>
            {application.resume && (
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Resume attached</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
