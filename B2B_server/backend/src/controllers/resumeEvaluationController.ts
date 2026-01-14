import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { evaluateResume } from '../services/resumeEvaluationService';
import ResponseUtil from '../utils/response';

export class ResumeEvaluationController {
  async evaluateResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtil.unauthorized(res, 'User ID not found in token');
        return;
      }

      const file = req.file;
      if (!file) {
        ResponseUtil.validationError(res, 'Resume file is required', [
          { field: 'file', message: 'Resume file is required (multipart/form-data)' }
        ]);
        return;
      }

      const jobDescription = req.body.jobDescription;
      if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
        ResponseUtil.validationError(res, 'Job description is required', [
          { field: 'jobDescription', message: 'Job description is required and cannot be empty' }
        ]);
        return;
      }

      const jobName = req.body.jobName;
      if (!jobName || typeof jobName !== 'string' || jobName.trim().length === 0) {
        ResponseUtil.validationError(res, 'Job name is required', [
          { field: 'jobName', message: 'Job name is required and cannot be empty' }
        ]);
        return;
      }

      let fileBuffer: Buffer;
      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.path) {
        const fs = require('fs');
        fileBuffer = fs.readFileSync(file.path);
      } else {
        ResponseUtil.validationError(res, 'File buffer is required', [
          { field: 'file', message: 'File buffer could not be read' }
        ]);
        return;
      }
      
      // Extract file extension from originalname, fallback to mimetype mapping
      let fileType: string;
      if (file.originalname) {
        const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
        fileType = ext ? `.${ext}` : '';
      } else {
        // Map MIME type to extension if originalname is not available
        const mimeToExt: Record<string, string> = {
          'application/pdf': '.pdf',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
          'text/plain': '.txt',
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/png': '.png',
        };
        fileType = file.mimetype ? (mimeToExt[file.mimetype] || '') : '';
      }
      
      if (!fileType) {
        ResponseUtil.validationError(res, 'Unable to determine file type', [
          { field: 'file', message: 'File type could not be determined from filename or MIME type' }
        ]);
        return;
      }

      console.log(`\n🚀 [EVALUATE API] Starting evaluation for user: ${userId}`);
      console.log(`   Job: ${jobName.trim()}`);
      console.log(`   File: ${file.originalname || 'unknown'} (${fileType})`);
      
      const result = await evaluateResume(
        fileBuffer,
        fileType,
        userId,
        jobDescription.trim(),
        jobName.trim()
      );
      
      console.log(`✅ [EVALUATE API] Evaluation completed for user: ${userId}\n`);

      if (!result.success) {
        ResponseUtil.serverError(res, result.error || 'Resume evaluation failed');
        return;
      }

      ResponseUtil.success(res, 'Resume evaluation completed successfully', {
        evaluationId: result.evaluationId,
        fileId: result.fileId,
        fileUrl: result.fileUrl,
        resumeData: result.resumeData,
        atsScore: result.scores?.ats,
        keywordScore: result.scores?.keyword,
        formatScore: result.scores?.format,
        overallScore: result.scores?.overall,
        suggestions: result.suggestions,
        review: result.review
      });

    } catch (error) {
      console.error('Resume evaluation controller error:', error);
      ResponseUtil.serverError(res, 'Failed to evaluate resume');
    }
  }
}

export const resumeEvaluationController = new ResumeEvaluationController();

