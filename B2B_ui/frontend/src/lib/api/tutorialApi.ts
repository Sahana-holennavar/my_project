/**
 * Tutorial API - Handles tutorial completion status
 */

import { apiClient } from '@/lib/api';

export interface TutorialStatusRequest {
  tutorial_status: 'complete' | 'skipped' | 'incomplete';
}

export interface TutorialStatusData {
  tutorialCompleted: boolean;
  status: string;
  completedAt?: string;
  lastStepIndex?: number;
}

export interface TutorialStatusResponse {
  success: boolean;
  message: string;
  data?: TutorialStatusData;
}

/**
 * Update tutorial completion status for the current user
 * Uses PATCH /api/auth/tutorial-status endpoint
 */
export const updateTutorialStatus = async (
  status: 'complete' | 'skipped' | 'incomplete'
): Promise<TutorialStatusResponse> => {
  try {
    const response = await apiClient.patch<TutorialStatusResponse>(
      '/auth/tutorial-status',
      { tutorial_status: status }
    );
    return response;
  } catch (error) {
    console.error('Error updating tutorial status:', error);
    throw error;
  }
};

/**
 * Get tutorial completion status from login response
 * Tutorial status is returned in the login response
 */
export const getTutorialStatus = async (): Promise<TutorialStatusResponse> => {
  try {
    // Note: Tutorial status comes from login response
    // This is a placeholder - in practice, get from login or user profile
    const response = await apiClient.get<TutorialStatusResponse>(
      '/auth/user'
    );
    return response;
  } catch (error) {
    console.error('Error fetching tutorial status:', error);
    throw error;
  }
};

