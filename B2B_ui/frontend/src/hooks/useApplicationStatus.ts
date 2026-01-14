import { useAppSelector } from '@/store/hooks';
import type { JobApplication } from '@/types/jobs';

export function useApplicationStatus(jobId: string): {
  hasApplied: boolean;
  application: JobApplication | null;
} {
  const { myApplications, currentApplication } = useAppSelector((state) => state.applications);

  const application = myApplications.find((app) => app.jobId === jobId) || currentApplication || null;
  const hasApplied = application !== null;

  return {
    hasApplied,
    application: application as JobApplication | null,
  };
}

