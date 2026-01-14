import { useMemo } from 'react';
import type { ApplicationDetails, ApplicationStatusType } from '@/types/jobs';

interface UseApplicationEditReturn {
  canEdit: boolean;
  isEditable: boolean;
}

export function useApplicationEdit(application: ApplicationDetails | null): UseApplicationEditReturn {
  const canEdit = useMemo(() => {
    if (!application) return false;
    return application.status === 'applied' || application.status === 'pending';
  }, [application]);

  return {
    canEdit,
    isEditable: canEdit,
  };
}

