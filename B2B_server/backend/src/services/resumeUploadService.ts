import { uploadBufferToS3 } from './s3Service';
import { validateResumeUploadFile, generateUniqueFileName, getFileExtension } from '../utils/resumeUploadUtils';
import { auditLoggerService } from './auditLoggerService';
import { randomUUID } from 'crypto';
import * as pdfjs from 'pdfjs-dist';

// ============================================
// PARSABILITY CHECK TYPES AND CONSTANTS
// ============================================

type FileCategory = 'pdf' | 'docx' | 'txt' | 'image' | 'unknown';

const MIME_TYPE_MAP: Record<string, FileCategory> = {
  'application/pdf': 'pdf',
  'application/msword': 'docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/tiff': 'image',
  'image/bmp': 'image',
};

const EXTENSION_MAP: Record<string, FileCategory> = {
  '.pdf': 'pdf',
  '.doc': 'docx',
  '.docx': 'docx',
  '.txt': 'txt',
  '.text': 'txt',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.tiff': 'image',
  '.tif': 'image',
  '.bmp': 'image',
};

const TEXT_HEURISTICS = {
  MIN_TEXT_LENGTH: 50,
  MIN_PRINTABLE_RATIO: 0.6,
  MIN_UNIQUE_CHARS: 10,
  MIN_NON_WHITESPACE_RATIO: 0.3,
  MIN_WORD_COUNT: 5,
};

// ============================================
// PARSABILITY CHECK HELPER FUNCTIONS
// ============================================

/**
 * Determines the file category from MIME type or file extension
 */
function getFileCategory(fileTypeOrExt: string): FileCategory {
  const normalized = fileTypeOrExt.toLowerCase().trim();

  if (MIME_TYPE_MAP[normalized]) {
    return MIME_TYPE_MAP[normalized];
  }

  const ext = normalized.startsWith('.') ? normalized : `.${normalized}`;
  if (EXTENSION_MAP[ext]) {
    return EXTENSION_MAP[ext];
  }

  return 'unknown';
}

/**
 * Checks if extracted text is meaningful (not gibberish or special chars only)
 */
function isMeaningfulText(text: string): boolean {
  if (!text || text.length < TEXT_HEURISTICS.MIN_TEXT_LENGTH) {
    return false;
  }

  const printableChars = text.match(/[\x20-\x7E\t\n\r]/g) || [];
  const printableRatio = printableChars.length / text.length;
  if (printableRatio < TEXT_HEURISTICS.MIN_PRINTABLE_RATIO) {
    return false;
  }

  const uniqueChars = new Set(text.toLowerCase()).size;
  if (uniqueChars < TEXT_HEURISTICS.MIN_UNIQUE_CHARS) {
    return false;
  }

  const nonWhitespace = text.replace(/\s/g, '');
  const nonWhitespaceRatio = nonWhitespace.length / text.length;
  if (nonWhitespaceRatio < TEXT_HEURISTICS.MIN_NON_WHITESPACE_RATIO) {
    return false;
  }

  const words = text.match(/\b\w+\b/g) || [];
  if (words.length < TEXT_HEURISTICS.MIN_WORD_COUNT) {
    return false;
  }

  return true;
}

/**
 * Extracts text from a PDF buffer using pdfjs-dist
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);

  const loadingTask = pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    textParts.push(pageText);
  }

  return textParts.join('\n');
}

// ============================================
// MAIN PARSABILITY CHECK FUNCTION
// ============================================

export interface CheckParsabilityResult {
  isParsable: boolean;
  fileCategory: FileCategory;
  extractedTextLength?: number;
  message: string;
}

/**
 * Checks whether a resume file is parsable (contains selectable text)
 * 
 * @param buffer - The file buffer to check
 * @param fileType - The MIME type or file extension (e.g., 'application/pdf', '.pdf', 'pdf')
 * @returns Promise<CheckParsabilityResult> - Result with isParsable boolean and details
 * 
 * @example
 * const result = await checkParsability(pdfBuffer, 'application/pdf');
 * if (result.isParsable) {
 *   // Proceed with text extraction/parsing
 * } else {
 *   // File requires OCR processing
 * }
 */
export async function checkParsability(
  buffer: Buffer,
  fileType: string
): Promise<CheckParsabilityResult> {
  // Validate inputs
  if (!buffer || buffer.length === 0) {
    console.warn('[checkParsability] Empty or invalid buffer provided');
    return {
      isParsable: false,
      fileCategory: 'unknown',
      message: 'Empty or invalid file buffer',
    };
  }

  if (!fileType || typeof fileType !== 'string') {
    console.warn('[checkParsability] Invalid file type provided');
    return {
      isParsable: false,
      fileCategory: 'unknown',
      message: 'Invalid file type',
    };
  }

  const category = getFileCategory(fileType);

  try {
    switch (category) {
      case 'txt':
        console.log('[checkParsability] TXT file detected - parsable');
        return {
          isParsable: true,
          fileCategory: 'txt',
          message: 'TXT files are always parsable',
        };

      case 'docx':
        console.log('[checkParsability] DOCX file detected - parsable');
        return {
          isParsable: true,
          fileCategory: 'docx',
          message: 'DOCX files are always parsable',
        };

      case 'image':
        console.log('[checkParsability] Image file detected - requires OCR');
        return {
          isParsable: false,
          fileCategory: 'image',
          message: 'Image files require OCR for text extraction',
        };

      case 'pdf':
        console.log('[checkParsability] PDF file detected - extracting text');
        const extractedText = await extractPdfText(buffer);
        const isParsable = isMeaningfulText(extractedText);

        if (isParsable) {
          console.log(`[checkParsability] PDF is parsable (${extractedText.length} chars extracted)`);
          return {
            isParsable: true,
            fileCategory: 'pdf',
            extractedTextLength: extractedText.length,
            message: `PDF contains selectable text (${extractedText.length} characters extracted)`,
          };
        } else {
          console.log('[checkParsability] PDF appears to be scanned/image-based - requires OCR');
          return {
            isParsable: false,
            fileCategory: 'pdf',
            extractedTextLength: extractedText.length,
            message: 'PDF appears to be scanned or image-based, requires OCR',
          };
        }

      case 'unknown':
      default:
        console.warn(`[checkParsability] Unknown file type: ${fileType}`);
        return {
          isParsable: false,
          fileCategory: 'unknown',
          message: `Unknown or unsupported file type: ${fileType}`,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[checkParsability] Error processing file: ${errorMessage}`, error);
    return {
      isParsable: false,
      fileCategory: category,
      message: `Error processing file: ${errorMessage}`,
    };
  }
}

// ============================================
// RESUME UPLOAD TYPES
// ============================================

export interface UploadResumeFileResult {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  error?: string;
}

export const uploadResumeFile = async (
  fileBuffer: Buffer,
  fileType: string,
  userId: string
): Promise<UploadResumeFileResult> => {
  const fileId = randomUUID();
  const timestamp = new Date().toISOString();
  let auditAction: string = '';

  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      const errorMsg = 'File buffer is empty or invalid';
      auditAction = JSON.stringify({
        fileId,
        fileUrl: null,
        status: 'failure',
        details: errorMsg,
        fileType: fileType || 'unknown',
        fileSize: 0,
        timestamp,
      });
      await logAuditEntry(userId, 'failure', auditAction, errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    if (!userId || typeof userId !== 'string') {
      const errorMsg = 'Invalid user ID';
      auditAction = JSON.stringify({
        fileId,
        fileUrl: null,
        status: 'failure',
        details: errorMsg,
        fileType: fileType || 'unknown',
        fileSize: fileBuffer.length,
        timestamp,
      });
      await logAuditEntry(userId, 'failure', auditAction, errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    const validation = validateResumeUploadFile(fileBuffer, fileType);
    if (!validation.isValid) {
      auditAction = JSON.stringify({
        fileId,
        fileUrl: null,
        status: 'failure',
        details: validation.error || 'Validation failed',
        fileType: fileType || 'unknown',
        fileSize: fileBuffer.length,
        timestamp,
      });
      await logAuditEntry(userId, 'failure', auditAction, validation.error || 'Validation failed');
      return {
        success: false,
        error: validation.error || 'File validation failed',
      };
    }

    const uniqueFileName = generateUniqueFileName(userId, fileType);
    const contentType = validation.detectedMimeType || 'application/octet-stream';

    const uploadResult = await uploadBufferToS3(
      fileBuffer,
      uniqueFileName,
      'resumeUpload',
      contentType,
      'resume-uploads'
    );

    auditAction = JSON.stringify({
      fileId: uploadResult.fileId,
      fileUrl: uploadResult.fileUrl,
      status: 'success',
      details: null,
      fileType: fileType,
      fileSize: fileBuffer.length,
      timestamp: uploadResult.uploadedAt,
    });

    await logAuditEntry(userId, 'success', auditAction, null);

    return {
      success: true,
      fileId: uploadResult.fileId,
      fileUrl: uploadResult.fileUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    auditAction = JSON.stringify({
      fileId,
      fileUrl: null,
      status: 'failure',
      details: errorMessage,
      fileType: fileType || 'unknown',
      fileSize: fileBuffer ? fileBuffer.length : 0,
      timestamp,
    });
    await logAuditEntry(userId, 'failure', auditAction, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

const logAuditEntry = async (
  userId: string,
  status: 'success' | 'failure',
  action: string,
  errorDetails: string | null
): Promise<void> => {
  try {
    await auditLoggerService.createAuditLog({
      event: 'RESUME_UPLOADED',
      user_id: userId,
      action: action,
      ip_address: null,
    });
  } catch (auditError) {
    console.error('Failed to create audit log entry:', auditError);
  }
}; 