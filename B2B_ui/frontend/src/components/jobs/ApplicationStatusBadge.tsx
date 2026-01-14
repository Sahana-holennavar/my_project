import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import type { ApplicationStatusType } from '@/types/jobs';
import { cn } from '@/lib/utils';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatusType;
  className?: string;
}

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = (status: ApplicationStatusType | string) => {
    const normalizedStatus = status === 'pending' ? 'applied' : status;
    switch (normalizedStatus) {
      case 'applied':
        return {
          label: 'Applied',
          icon: Clock,
          className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        };
      case 'selected':
        return {
          label: 'Selected',
          icon: CheckCircle,
          className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
        };
      default:
        return {
          label: normalizedStatus,
          icon: Clock,
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={cn('flex items-center gap-1 px-2 py-1 text-xs font-medium border', config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

