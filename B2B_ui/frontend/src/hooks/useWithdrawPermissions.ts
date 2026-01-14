import { useMemo } from 'react';
import type { ApplicationDetails, MyApplication } from '@/types/jobs';

interface UseWithdrawPermissionsReturn {
  canWithdraw: boolean;
  reason?: string;
}

export function useWithdrawPermissions(application: ApplicationDetails | MyApplication | null): UseWithdrawPermissionsReturn {
  const permissions = useMemo(() => {
    if (!application) {
      return { canWithdraw: false, reason: 'Application not found' };
    }

    if (application.status === 'applied' || application.status === 'pending') {
      return { canWithdraw: true };
    }

    if (application.status === 'selected' || application.status === 'reviewed') {
      return { canWithdraw: false, reason: 'Cannot withdraw reviewed applications' };
    }

    if (application.status === 'rejected') {
      return { canWithdraw: false, reason: 'Application has already been rejected' };
    }

    return { canWithdraw: false, reason: 'Application cannot be withdrawn at this status' };
  }, [application]);

  return permissions;
}

