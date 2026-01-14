import { Request, Response } from 'express';
import { extractTextWithOCR } from '../services/ocrService';

/**
 * OCR Controller for Text Extraction Testing
 * 
 * This controller handles the test API endpoint for extracting text
 * from images and scanned PDFs using OCR.
 */

/**
 * POST /api/test/ocr
 * 
 * Extracts text from an uploaded image or scanned PDF using OCR
 * 
 * @param req - Request with file uploaded via multer
 * @param res - Response with OCR extraction result
 */
export const testOCR = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a file using form-data with key "file"',
        supportedFormats: {
          images: ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'TIFF', 'BMP'],
          documents: ['PDF (scanned)'],
        },
      });
      return;
    }

    const { buffer, mimetype, originalname, size } = req.file;

    // Log the request
    console.log('[testOCR] Processing file:', {
      originalname,
      mimetype,
      size,
    });

    // Validate file size (10MB limit)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (size > maxSizeBytes) {
      res.status(400).json({
        success: false,
        error: 'File too large',
        message: `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 10MB`,
      });
      return;
    }

    // Determine file type from mimetype or extension
    const fileExtension = originalname.split('.').pop()?.toLowerCase() || '';
    const fileType = mimetype || `.${fileExtension}`;

    // Call the extractTextWithOCR function with timeout
    console.log('[testOCR] Calling extractTextWithOCR...');
    let result;
    
    try {
      // Set a timeout for OCR processing (60 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OCR processing timeout (60s)')), 60000);
      });
      
      result = await Promise.race([
        extractTextWithOCR(buffer, fileType),
        timeoutPromise
      ]);
    } catch (ocrError) {
      const errorMsg = ocrError instanceof Error ? ocrError.message : 'Unknown OCR error';
      console.error('[testOCR] OCR processing error:', errorMsg);
      
      res.status(500).json({
        success: false,
        error: errorMsg,
        message: 'OCR processing failed or timed out',
        data: {
          fileName: originalname,
          fileSize: size,
          mimeType: mimetype,
        }
      });
      return;
    }

    // Return the result
    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          fileName: originalname,
          fileSize: size,
          fileSizeFormatted: `${(size / 1024).toFixed(2)} KB`,
          mimeType: mimetype,
          fileType: result.fileType,
          extractedText: result.extractedText,
          textLength: result.extractedText.length,
          confidence: result.confidence,
          processingTimeMs: result.processingTimeMs,
          ...(result.pageCount && { pageCount: result.pageCount }),
          ...(result.extractionMethod && { extractionMethod: result.extractionMethod }),
        },
        message: result.message,
      });
    } else {
      res.status(422).json({
        success: false,
        data: {
          fileName: originalname,
          fileSize: size,
          mimeType: mimetype,
          fileType: result.fileType,
          processingTimeMs: result.processingTimeMs,
          ...(result.pageCount && { pageCount: result.pageCount }),
          ...(result.extractionMethod && { extractionMethod: result.extractionMethod }),
        },
        error: result.error,
        message: result.message,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[testOCR] Error:', error);

    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to process OCR request',
    });
  }
};

/**
 * GET /api/test/ocr/info
 * 
 * Returns information about the OCR service and supported file types
 */
export const getOCRInfo = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      service: 'OCR Text Extraction Service',
      version: '1.0.0',
      engine: 'Tesseract.js',
      supportedFormats: {
        images: ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'TIFF', 'TIF', 'BMP'],
        documents: ['PDF (scanned/image-based)'],
      },
      constraints: {
        maxFileSizeMB: 10,
        language: 'English (eng)',
      },
      usage: {
        endpoint: 'POST /api/test/ocr',
        contentType: 'multipart/form-data',
        fieldName: 'file',
      },
    },
    message: 'OCR service information retrieved successfully',
  });
};
