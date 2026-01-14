import { uploadResumeFile, checkParsability } from './resumeUploadService';
import { extractTextWithOCR } from './ocrService';
import { parseResume, ParsedResumeData } from './resumeParseService';
import { gradeResumeWithGeminiEmbeddingGapAnalysis, GradingResult } from './resumeGradingService';
import { database } from '../config/database';
import { config } from '../config/env';
import { randomUUID } from 'crypto';
import { socketService } from './SocketService';
import { ResumeStatusStep, ResumeStatusState } from '../types/socket.types';

export interface EvaluationResult {
  success: boolean;
  evaluationId?: string;
  fileId?: string;
  fileUrl?: string;
  resumeData?: ParsedResumeData;
  scores?: {
    overall: number;
    ats: number;
    keyword: number;
    format: number;
    experience?: number;
  };
  suggestions?: any[];
  review?: string;
  gradingId?: string;
  error?: string;
}

export async function evaluateResume(
  fileBuffer: Buffer,
  fileType: string,
  userId: string,
  jobDescription: string,
  jobName: string
): Promise<EvaluationResult> {
  const startTime = Date.now();
  const evaluationId = randomUUID();

  const emitStatus = (update: {
    step: ResumeStatusStep;
    status: ResumeStatusState;
    details?: string;
    fileId?: string;
    fileUrl?: string;
    progress?: number;
    scores?: EvaluationResult['scores'];
    error?: string;
  }): void => {
    try {
      console.log(`[evaluateResume] Emitting status for user ${userId}: ${update.step} - ${update.status}`);
      
      // Build payload only with defined properties to satisfy strict optional typing
      const payload: any = {
        evaluationId,
        jobName,
        step: update.step,
        status: update.status,
      };

      if (update.details !== undefined) payload.details = update.details;
      if (update.fileId !== undefined) payload.fileId = update.fileId;
      if (update.fileUrl !== undefined) payload.fileUrl = update.fileUrl;
      if (update.progress !== undefined) payload.progress = update.progress;
      if (update.scores !== undefined) payload.scores = update.scores;
      if (update.error !== undefined) payload.error = update.error;

      socketService.sendResumeStatus(userId, payload as any);
    } catch (emitError) {
      console.error('[evaluateResume] Failed to emit status update:', emitError);
    }
  };
  let emittedFailure = false;

  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }

    if (!jobDescription || jobDescription.trim().length === 0) {
      throw new Error('Job description is required');
    }

    if (!jobName || jobName.trim().length === 0) {
      throw new Error('Job name is required');
    }

    // Upload step with specific failure emission
    emitStatus({ step: 'upload', status: 'in_progress', details: 'Uploading resume file' });
    let uploadResult;
    try {
      uploadResult = await uploadResumeFile(fileBuffer, fileType, userId);
      if (!uploadResult.success || !uploadResult.fileId || !uploadResult.fileUrl) {
        const errMsg = uploadResult.error || 'File upload failed';
        emitStatus({ step: 'upload', status: 'failed', details: errMsg, error: errMsg });
        emittedFailure = true;
        return { success: false, evaluationId, error: errMsg };
      }
      emitStatus({
        step: 'upload',
        status: 'completed',
        details: 'Resume uploaded successfully',
        fileId: uploadResult.fileId,
        fileUrl: uploadResult.fileUrl
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitStatus({ step: 'upload', status: 'failed', details: 'Upload failed', error: msg });
      emittedFailure = true;
      return { success: false, evaluationId, error: msg };
    }

    // Parsability check with failure emission
    emitStatus({ step: 'parsability_check', status: 'in_progress', details: 'Checking parsability' });
    let parsabilityResult;
    try {
      parsabilityResult = await checkParsability(fileBuffer, fileType);
      emitStatus({
        step: 'parsability_check',
        status: 'completed',
        details: parsabilityResult.message,
        progress: 25
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitStatus({ step: 'parsability_check', status: 'failed', details: 'Parsability check failed', error: msg });
      emittedFailure = true;
      return { success: false, evaluationId, error: msg };
    }

    let ocrText: string | undefined;
    if (!parsabilityResult.isParsable) {
      // OCR step with failure emission
      emitStatus({ step: 'ocr', status: 'in_progress', details: 'Running OCR because file is not directly parsable' });
      try {
        const ocrResult = await extractTextWithOCR(fileBuffer, fileType);
        if (!ocrResult.success || !ocrResult.extractedText) {
          const errMsg = ocrResult.error || 'OCR extraction failed';
          emitStatus({ step: 'ocr', status: 'failed', details: errMsg, error: errMsg });
          emittedFailure = true;
          return { success: false, evaluationId, error: errMsg };
        }
        ocrText = ocrResult.extractedText;
        emitStatus({ step: 'ocr', status: 'completed', details: 'OCR extraction completed', progress: 40 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitStatus({ step: 'ocr', status: 'failed', details: 'OCR extraction failed', error: msg });
        emittedFailure = true;
        return { success: false, evaluationId, error: msg };
      }
    }

    // Parsing step with failure emission
    emitStatus({ step: 'parsing', status: 'in_progress', details: 'Parsing resume content' });
    let parseResult;
    let parsedData: ParsedResumeData | undefined;
    try {
      parseResult = await parseResume(fileBuffer, fileType, ocrText);
      if (!parseResult.success || !parseResult.parsedData) {
        const errMsg = parseResult.error || 'Resume parsing failed';
        emitStatus({ step: 'parsing', status: 'failed', details: errMsg, error: errMsg });
        emittedFailure = true;
        return { success: false, evaluationId, error: errMsg };
      }
      parsedData = parseResult.parsedData;
      emitStatus({ step: 'parsing', status: 'completed', details: 'Resume parsed successfully', progress: 60 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitStatus({ step: 'parsing', status: 'failed', details: 'Resume parsing failed', error: msg });
      emittedFailure = true;
      return { success: false, evaluationId, error: msg };
    }

    // Grading step with failure emission
    emitStatus({ step: 'grading', status: 'in_progress', details: 'Grading resume against job description' });
    let gradingResult;
    try {
      gradingResult = await gradeResumeWithGeminiEmbeddingGapAnalysis(
        // use parsed data from parsing step
        parsedData!,
        jobDescription,
        jobName
      );
      emitStatus({
        step: 'grading',
        status: 'completed',
        details: 'Resume graded successfully',
        progress: 90,
        scores: gradingResult.scores
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitStatus({ step: 'grading', status: 'failed', details: 'Grading failed', error: msg });
      emittedFailure = true;
      return { success: false, evaluationId, error: msg };
    }

    const gradingId = await storeResumeGrading(
      userId,
      jobName,
      jobDescription,
      parsedData,
      gradingResult
    );

    const scores: EvaluationResult['scores'] = {
      overall: gradingResult.scores.overall,
      ats: gradingResult.scores.ats,
      keyword: gradingResult.scores.keyword,
      format: gradingResult.scores.format
    };
    if (gradingResult.scores.experience !== undefined) {
      scores.experience = gradingResult.scores.experience;
    }

    emitStatus({
      step: 'completed',
      status: 'completed',
      details: 'Resume evaluation completed',
      progress: 100,
      fileId: uploadResult.fileId,
      fileUrl: uploadResult.fileUrl,
      scores,
    });

    return {
      success: true,
      fileId: uploadResult.fileId,
      fileUrl: uploadResult.fileUrl,
      resumeData: parsedData,
      scores,
      suggestions: gradingResult.suggestions,
      review: gradingResult.reviewText,
      evaluationId,
      gradingId
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[evaluateResume] Evaluation failed: ${errorMessage}`, error);
    // Emit a generic failed event only if a step-specific failure wasn't already emitted
    if (!emittedFailure) {
      emitStatus({ step: 'failed', status: 'failed', details: 'Resume evaluation failed', error: errorMessage });
    }
    return {
      success: false,
      evaluationId,
      error: errorMessage
    };
  }
}

async function storeResumeGrading(
  userId: string,
  jobTitle: string,
  jobDescription: string,
  resumeJson: ParsedResumeData,
  gradingResult: GradingResult
): Promise<string> {
  const gradingId = randomUUID();

  const query = `
    INSERT INTO "${config.DB_SCHEMA}".resume_grading (
      id,
      user_id,
      job_id,
      job_title,
      job_description,
      resume_json,
      ats_score,
      keyword_score,
      format_score,
      overall_score,
      suggestions,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `;

  const values = [
    gradingId,
    userId,
    null,
    jobTitle,
    jobDescription,
    JSON.stringify(resumeJson),
    gradingResult.scores.ats,
    gradingResult.scores.keyword,
    gradingResult.scores.format,
    gradingResult.scores.overall,
    JSON.stringify(gradingResult.suggestions)
  ];

  try {
    const result = await database.query(query, values) as { rows: Array<{ id: string }> };
    if (result.rows && result.rows.length > 0 && result.rows[0]) {
      return result.rows[0].id;
    }
    return gradingId;
  } catch (error) {
    console.error('[storeResumeGrading] Database error:', error);
    throw new Error(`Failed to store resume grading: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

