import { Response } from 'express';
import { ContestService } from '../services/contestService';
import { ResponseUtil } from '../utils/response';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  validateCreateContest,
  validateUpdateContest,
  validateStartContest,
  validateSelectWinner,
  validateUUID,
  validateRegisterContest
} from '../utils/validators';
import type { CreateContestData, UpdateContestData, ContestResponse } from '../models/Contest';
import { uploadContestSubmissionToS3 } from '../services/s3Service';
import fs from 'fs';

export class ContestController {
  // Create new contest (organizer only)
  static async createContest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      // Validate request body
      const { error, value } = validateCreateContest(req.body);
      if (error) {
        ResponseUtil.sendError(res, error.details.map(d => d.message).join(', '), 400);
        return;
      }

      const contestData: CreateContestData = value;
      const contest = await ContestService.createContest(contestData, userId);

      const response: ContestResponse = {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        problem_statement: contest.problem_statement,
        ...(contest.problem_statement_images && { problem_statement_images: contest.problem_statement_images }),
        status: contest.status,
        start_time: contest.start_time ? contest.start_time.toISOString() : null,
        end_time: contest.end_time ? contest.end_time.toISOString() : null,
        created_by: contest.created_by,
        created_at: contest.created_at.toISOString(),
        updated_at: contest.updated_at.toISOString()
      };

      ResponseUtil.sendSuccess(res, response, 'Contest created successfully', 201);
    } catch (error: any) {
      console.error('Create contest error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to create contest', 500);
    }
  }

  // Get contest by ID
  static async getContest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const { error } = validateUUID(contestId, 'Contest ID');
      if (error) {
        ResponseUtil.sendError(res, error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      const contest = await ContestService.getContestById(contestId);
      if (!contest) {
        ResponseUtil.sendError(res, 'Contest not found', 404);
        return;
      }

      const response: ContestResponse = {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        problem_statement: contest.problem_statement,
        ...(contest.problem_statement_images && { problem_statement_images: contest.problem_statement_images }),
        status: contest.status,
        start_time: contest.start_time ? contest.start_time.toISOString() : null,
        end_time: contest.end_time ? contest.end_time.toISOString() : null,
        poster : contest.poster,
        created_by: contest.created_by,
        created_at: contest.created_at.toISOString(),
        updated_at: contest.updated_at.toISOString()
      };

      ResponseUtil.sendSuccess(res, response, 'Contest retrieved successfully');
    } catch (error: any) {
      console.error('Get contest error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to retrieve contest', 500);
    }
  }

  // Get all contests
  static async getAllContests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, created_by, limit, offset } = req.query;

      const filters: { status?: string; created_by?: string } = {};
      if (status && typeof status === 'string') {
        filters.status = status;
      }
      if (created_by && typeof created_by === 'string') {
        filters.created_by = created_by;
      }

      const pagination = {
        limit: limit ? parseInt(limit as string) : 10,
        offset: offset ? parseInt(offset as string) : 0
      };

      const { contests, total } = await ContestService.getAllContests(filters, pagination);

      const response = {
        contests: contests.map(contest => ({
          id: contest.id,
          title: contest.title,
          description: contest.description,
          problem_statement: contest.problem_statement,
          ...(contest.problem_statement_images && { problem_statement_images: contest.problem_statement_images }),
          status: contest.status,
          start_time: contest.start_time ? contest.start_time.toISOString() : null,
          end_time: contest.end_time ? contest.end_time.toISOString() : null,
          created_by: contest.created_by,
          created_at: contest.created_at.toISOString(),
          updated_at: contest.updated_at.toISOString()
        })),
        pagination: {
          total,
          limit: pagination.limit,
          offset: pagination.offset,
          pages: Math.ceil(total / pagination.limit)
        }
      };

      ResponseUtil.sendSuccess(res, response, 'Contests retrieved successfully');
    } catch (error: any) {
      console.error('Get contests error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to retrieve contests', 500);
    }
  }

  // Update contest (organizer only)
  static async updateContest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const uuidValidation = validateUUID(contestId, 'Contest ID');
      if (uuidValidation.error) {
        ResponseUtil.sendError(res, uuidValidation.error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      const { error, value } = validateUpdateContest(req.body);
      if (error) {
        ResponseUtil.sendError(res, error.details?.map(d => d.message).join(', ') || 'Validation failed', 400);
        return;
      }

      const updateData: UpdateContestData = value;
      const contest = await ContestService.updateContest(contestId, updateData, userId);

      const response: ContestResponse = {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        problem_statement: contest.problem_statement,
        ...(contest.problem_statement_images && { problem_statement_images: contest.problem_statement_images }),
        status: contest.status,
        start_time: contest.start_time ? contest.start_time.toISOString() : null,
        end_time: contest.end_time ? contest.end_time.toISOString() : null,
        created_by: contest.created_by,
        created_at: contest.created_at.toISOString(),
        updated_at: contest.updated_at.toISOString()
      };

      ResponseUtil.sendSuccess(res, response, 'Contest updated successfully');
    } catch (error: any) {
      console.error('Update contest error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to update contest', 500);
    }
  }

  // Delete contest (organizer only)
  static async deleteContest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const { error } = validateUUID(contestId, 'Contest ID');
      if (error) {
        ResponseUtil.sendError(res, error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      await ContestService.deleteContest(contestId, userId);

      ResponseUtil.sendSuccess(res, null, 'Contest deleted successfully');
    } catch (error: any) {
      console.error('Delete contest error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to delete contest', 500);
    }
  }

  // Start contest (organizer only)
  static async startContest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const uuidValidation = validateUUID(contestId, 'Contest ID');
      if (uuidValidation.error) {
        ResponseUtil.sendError(res, uuidValidation.error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      const { error, value } = validateStartContest(req.body);
      if (error) {
        ResponseUtil.sendError(res, error.details?.map(d => d.message).join(', ') || 'Validation failed', 400);
        return;
      }

      const { start_time, end_time } = value;
      const contest = await ContestService.startContest(
        contestId,
        new Date(start_time),
        new Date(end_time),
        userId
      );

      const response: ContestResponse = {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        problem_statement: contest.problem_statement,
        ...(contest.problem_statement_images && { problem_statement_images: contest.problem_statement_images }),
        status: contest.status,
        start_time: contest.start_time ? contest.start_time.toISOString() : null,
        end_time: contest.end_time ? contest.end_time.toISOString() : null,
        created_by: contest.created_by,
        created_at: contest.created_at.toISOString(),
        updated_at: contest.updated_at.toISOString()
      };

      ResponseUtil.sendSuccess(res, response, 'Contest started successfully');
    } catch (error: any) {
      console.error('Start contest error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to start contest', 500);
    }
  }

  // Submit solution (user action)
  static async submitSolution(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const { error } = validateUUID(contestId, 'Contest ID');
      if (error) {
        ResponseUtil.sendError(res, error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        ResponseUtil.sendError(res, 'Solution file is required', 400);
        return;
      }

      const file = req.file;
      
      try {
        // Upload file to S3
        const uploadResult = await uploadContestSubmissionToS3(
          file.path,
          contestId,
          userId
        );

        // Delete temporary file after successful upload
        if (fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }

        const fileData = {
          filename: file.originalname,
          s3Url: uploadResult.fileUrl,
          fileType: file.mimetype
        };

        const submission = await ContestService.submitSolution(contestId, userId, fileData);

        ResponseUtil.sendSuccess(
          res,
          {
            id: submission.id,
            contest_id: submission.contest_id,
            user_id: submission.user_id,
            answer: submission.answer,
            has_profile: submission.has_profile,
            user_info: submission.user_info,
            submitted_at: submission.submitted_at
          },
          'Solution submitted successfully',
          201
        );
      } catch (uploadError: any) {
        // Clean up temporary file on error
        if (file.path && fs.existsSync(file.path)) {
          try {
            await fs.promises.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error deleting temp file:', unlinkError);
          }
        }
        throw uploadError;
      }
    } catch (error: any) {
      console.error('Submit solution error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to submit solution', 500);
    }
  }

  // Register for contest
  static async registerForContest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const { error: uuidError } = validateUUID(contestId, 'Contest ID');
      if (uuidError) {
        ResponseUtil.sendError(res, uuidError.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      // has_profile comes from query parameter
      const hasProfileParam = req.query.has_profile;
      if (hasProfileParam === undefined) {
        ResponseUtil.sendError(res, 'has_profile query parameter is required', 400);
        return;
      }

      const has_profile = hasProfileParam === 'true';

      // If has_profile is false, validate user_info from body
      let user_info: { firstName: string; lastName: string; phoneNumber?: string; } | undefined = undefined;
      if (!has_profile) {
        const { error, value } = validateRegisterContest(req.body);
        if (error) {
          ResponseUtil.sendError(res, error.details?.map(d => d.message).join(', ') || 'Validation failed', 400);
          return;
        }
        user_info = {
          firstName: value.firstName,
          lastName: value.lastName,
          ...(value.phoneNumber && { phoneNumber: value.phoneNumber })
        };
      }

      const registration = await ContestService.registerForContest(
        contestId,
        userId,
        has_profile,
        user_info
      );

      ResponseUtil.sendSuccess(
        res,
        {
          id: registration.id,
          contest_id: registration.contest_id,
          user_id: registration.user_id,
          has_profile: registration.has_profile,
          user_info: registration.user_info,
          submitted_at: registration.submitted_at
        },
        'Successfully registered for contest',
        201
      );
    } catch (error: any) {
      console.error('Register contest error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to register for contest', 500);
    }
  }

  // Get contest submissions (organizer only)
  static async getContestSubmissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const { error } = validateUUID(contestId, 'Contest ID');
      if (error) {
        ResponseUtil.sendError(res, error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      const submissions = await ContestService.getContestSubmissions(contestId);

      ResponseUtil.sendSuccess(
        res,
        { submissions, total: submissions.length },
        'Submissions retrieved successfully'
      );
    } catch (error: any) {
      console.error('Get submissions error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to retrieve submissions', 500);
    }
  }

  // Select winner (organizer only)
  static async selectWinner(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const uuidValidation = validateUUID(contestId, 'Contest ID');
      if (uuidValidation.error) {
        ResponseUtil.sendError(res, uuidValidation.error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      const { error, value } = validateSelectWinner(req.body);
      if (error) {
        ResponseUtil.sendError(res, error.details?.map(d => d.message).join(', ') || 'Validation failed', 400);
        return;
      }

      const { submission_id } = value;
      const winner = await ContestService.selectWinner(contestId, submission_id, userId);

      ResponseUtil.sendSuccess(
        res,
        {
          id: winner.id,
          contest_id: winner.contest_id,
          user_id: winner.user_id,
          answer: winner.answer,
          winner: winner.winner,
          submitted_at: winner.submitted_at
        },
        'Winner selected successfully'
      );
    } catch (error: any) {
      console.error('Select winner error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to select winner', 500);
    }
  }

  // Get user's own submission for a contest
  static async getUserSubmission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const { error } = validateUUID(contestId, 'Contest ID');
      if (error) {
        ResponseUtil.sendError(res, error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      const submission = await ContestService.getUserSubmission(contestId, userId);

      if (!submission) {
        ResponseUtil.sendError(res, 'No submission found', 404);
        return;
      }

      ResponseUtil.sendSuccess(
        res,
        {
          id: submission.id,
          contest_id: submission.contest_id,
          user_id: submission.user_id,
          answer: submission.answer,
          winner: submission.winner,
          submitted_at: submission.submitted_at
        },
        'Submission retrieved successfully'
      );
    } catch (error: any) {
      console.error('Get user submission error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to retrieve submission', 500);
    }
  }

  // Check registration and submission status
  static async checkRegistrationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        ResponseUtil.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { contestId } = req.params;

      if (!contestId) {
        ResponseUtil.sendError(res, 'Contest ID is required', 400);
        return;
      }

      const { error } = validateUUID(contestId, 'Contest ID');
      if (error) {
        ResponseUtil.sendError(res, error.details?.[0]?.message || 'Invalid Contest ID', 400);
        return;
      }

      const status = await ContestService.checkRegistrationStatus(contestId, userId);

      ResponseUtil.sendSuccess(
        res,
        status,
        'Registration status retrieved successfully'
      );
    } catch (error: any) {
      console.error('Check registration status error:', error);
      ResponseUtil.sendError(res, error.message || 'Failed to check registration status', 500);
    }
  }
}
