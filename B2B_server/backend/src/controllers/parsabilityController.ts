import { Request, Response } from 'express';
import { checkParsability } from '../services/resumeUploadService';

/**
 * Test Controller for Parsability Check
 * 
 * This controller handles the test API endpoint for checking
 * whether a resume file is parsable or requires OCR.
 */

/**
 * POST /api/test/parsability
 * 
 * Checks if an uploaded file is parsable (contains selectable text)
 * 
 * @param req - Request with file uploaded via multer
 * @param res - Response with parsability result
 */
export const testParsability = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a file using form-data with key "file"',
      });
      return;
    }

    const { buffer, mimetype, originalname, size } = req.file;

    // Log the request
    console.log('[testParsability] Processing file:', {
      originalname,
      mimetype,
      size,
    });

    // Determine file type from mimetype or extension
    const fileExtension = originalname.split('.').pop()?.toLowerCase() || '';
    const fileType = mimetype || `.${fileExtension}`;

    // Call the checkParsability function
    const result = await checkParsability(buffer, fileType);

    // Return the result
    res.status(200).json({
      success: true,
      data: {
        fileName: originalname,
        fileSize: size,
        mimeType: mimetype,
        ...result,
      },
      message: result.isParsable
        ? 'File is parsable and contains selectable text'
        : 'File requires OCR for text extraction',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[testParsability] Error:', error);

    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to check file parsability',
    });
  }
};
