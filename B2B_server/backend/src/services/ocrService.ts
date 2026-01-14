import Tesseract from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
import sharp from 'sharp';

// ============================================
// OCR SERVICE TYPES AND CONSTANTS
// ============================================

type SupportedFileType = 'image' | 'pdf' | 'unknown';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/bmp',
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.bmp'];

const PDF_MIME_TYPES = ['application/pdf'];
const PDF_EXTENSIONS = ['.pdf'];

// ============================================
// OCR RESULT INTERFACE
// ============================================

export interface OCRResult {
  success: boolean;
  extractedText: string;
  confidence?: number;
  fileType: SupportedFileType;
  processingTimeMs: number;
  message: string;
  error?: string;
  pageCount?: number;
  extractionMethod?: 'native' | 'ocr' | 'hybrid';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determines the file type from MIME type or extension
 */
function getFileType(mimeTypeOrExtension: string): SupportedFileType {
  const normalized = mimeTypeOrExtension.toLowerCase().trim();

  // Check for image types
  if (IMAGE_MIME_TYPES.includes(normalized)) {
    return 'image';
  }

  // Check for image extensions
  const ext = normalized.startsWith('.') ? normalized : `.${normalized}`;
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return 'image';
  }

  // Check for PDF types
  if (PDF_MIME_TYPES.includes(normalized)) {
    return 'pdf';
  }

  if (PDF_EXTENSIONS.includes(ext)) {
    return 'pdf';
  }

  return 'unknown';
}

/**
 * Validates the file buffer and type before OCR processing
 */
function validateFile(buffer: Buffer, fileType: string): { valid: boolean; error?: string; type: SupportedFileType } {
  // Check if buffer exists and is not empty
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty or invalid file buffer', type: 'unknown' };
  }

  // Check file size
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { 
      valid: false, 
      error: `File size exceeds maximum limit of ${MAX_FILE_SIZE_MB}MB`, 
      type: 'unknown' 
    };
  }

  // Check file type
  if (!fileType || typeof fileType !== 'string') {
    return { valid: false, error: 'Invalid file type provided', type: 'unknown' };
  }

  const type = getFileType(fileType);
  if (type === 'unknown') {
    return { 
      valid: false, 
      error: `Unsupported file type: ${fileType}. Supported types: images (JPG, PNG, GIF, WEBP, TIFF, BMP) and PDF`, 
      type: 'unknown' 
    };
  }

  return { valid: true, type };
}

/**
 * Extracts text from an image buffer using Tesseract.js
 */
async function extractTextFromImage(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  console.log('[OCR] Starting image text extraction with Tesseract.js');

  try {
    const result = await Tesseract.recognize(buffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text.trim();
    const confidence = result.data.confidence;

    console.log(`[OCR] Image extraction complete. Confidence: ${confidence}%, Text length: ${text.length}`);

    return { text, confidence };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[OCR] Image extraction failed: ${errorMsg}`);
    throw error;
  }
}

/**
 * Extracts native text from a PDF page using pdfjs
 */
async function extractNativeTextFromPage(page: pdfjs.PDFPageProxy): Promise<string> {
  const textContent = await page.getTextContent();
  
  // Build text with proper spacing
  const textItems = textContent.items
    .map((item) => ('str' in item ? item.str : ''))
    .filter(str => str.length > 0);
  
  return textItems.join(' ').trim();
}

/**
 * Checks if a PDF page has embedded images (likely a scanned page)
 */
async function pageHasImages(page: pdfjs.PDFPageProxy): Promise<boolean> {
  const operatorList = await page.getOperatorList();
  
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    if (fn === pdfjs.OPS.paintImageXObject || 
        fn === pdfjs.OPS.paintImageXObjectRepeat) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extracts embedded images from a PDF page for OCR
 */
async function extractImagesFromPage(page: pdfjs.PDFPageProxy): Promise<Array<{ data: Uint8ClampedArray; width: number; height: number }>> {
  const images: Array<{ data: Uint8ClampedArray; width: number; height: number }> = [];
  const operatorList = await page.getOperatorList();
  
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    
    if (fn === pdfjs.OPS.paintImageXObject) {
      const imageName = operatorList.argsArray[i][0];
      
      try {
        // Wait for the image to be available
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Image load timeout')), 5000);
          
          page.objs.get(imageName, (img: unknown) => {
            clearTimeout(timeout);
            resolve();
          });
        });

        const img = page.objs.get(imageName) as { 
          data: Uint8ClampedArray; 
          width: number; 
          height: number;
          kind?: number;
        } | null;
        
        if (img && img.data && img.width && img.height && img.width > 100 && img.height > 100) {
          images.push({
            data: img.data,
            width: img.width,
            height: img.height
          });
        }
      } catch (error) {
        console.warn(`[OCR] Could not extract image ${imageName}:`, error);
      }
    }
  }
  
  return images;
}

/**
 * Runs OCR on an embedded image from a PDF
 */
async function ocrEmbeddedImage(imageData: { data: Uint8ClampedArray; width: number; height: number }): Promise<{ text: string; confidence: number }> {
  const { data, width, height } = imageData;
  
  console.log(`[OCR] Processing embedded image: ${width}x${height}`);
  
  try {
    // Validate dimensions
    if (width <= 0 || height <= 0) {
      console.warn('[OCR] Invalid image dimensions');
      return { text: '', confidence: 0 };
    }
    
    // Detect number of channels in the image data
    // PDF images can be RGB (3 channels) or RGBA (4 channels)
    const actualChannels = Math.floor(data.length / (width * height));
    
    if (actualChannels !== 3 && actualChannels !== 4) {
      console.warn(`[OCR] Unexpected number of channels: ${actualChannels}. Data length: ${data.length}, Dimensions: ${width}x${height}`);
      return { text: '', confidence: 0 };
    }
    
    console.log(`[OCR] Image has ${actualChannels} channels (${actualChannels === 3 ? 'RGB' : 'RGBA'})`);
    
    // Convert raw buffer to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(data), {
      raw: {
        width,
        height,
        channels: actualChannels, // Use detected channels (3 for RGB, 4 for RGBA)
      }
    })
    .png()
    .toBuffer();
    
    console.log(`[OCR] Converted image to PNG (${pngBuffer.length} bytes)`);
    
    // Now pass the PNG buffer to Tesseract
    const result = await Tesseract.recognize(
      pngBuffer,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Embedded image OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }
    );
    
    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[OCR] Failed to OCR embedded image: ${errorMsg}`);
    return { text: '', confidence: 0 };
  }
}

/**
 * Extracts text from a PDF using native text extraction and OCR for scanned pages
 */
async function extractTextFromPdf(buffer: Buffer): Promise<{ 
  text: string; 
  confidence: number; 
  pageCount: number;
  extractionMethod: 'native' | 'ocr' | 'hybrid';
}> {
  console.log('[OCR] Starting PDF text extraction');

  try {
    const data = new Uint8Array(buffer);
    
    const loadingTask = pdfjs.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const allText: string[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;
    let usedOCR = false;
    let usedNative = false;

    console.log(`[OCR] Processing ${pageCount} PDF pages`);

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    console.log(`[OCR] Processing page ${pageNum}/${pageCount}`);
    
    const page = await pdf.getPage(pageNum);
    
    // First, try to extract native text
    const nativeText = await extractNativeTextFromPage(page);
    
    // Check if we have meaningful text (more than just whitespace and a few chars)
    const hasMeaningfulText = nativeText.length > 50 && 
                              nativeText.split(/\s+/).filter(w => w.length > 1).length > 5;
    
    if (hasMeaningfulText) {
      console.log(`[OCR] Page ${pageNum}: Found native text (${nativeText.length} chars)`);
      allText.push(`--- Page ${pageNum} ---\n${nativeText}`);
      totalConfidence += 100;
      confidenceCount++;
      usedNative = true;
    } else {
      // Check if page has images (likely scanned)
      const hasImages = await pageHasImages(page);
      
      if (hasImages) {
        console.log(`[OCR] Page ${pageNum}: Detected as scanned, extracting images for OCR`);
        
        try {
          const images = await extractImagesFromPage(page);
          
          if (images.length > 0) {
            console.log(`[OCR] Page ${pageNum}: Found ${images.length} embedded images`);
            
            for (const img of images) {
              try {
                const ocrResult = await ocrEmbeddedImage(img);
                
                if (ocrResult.text.length > 0) {
                  allText.push(`--- Page ${pageNum} (OCR) ---\n${ocrResult.text}`);
                  totalConfidence += ocrResult.confidence;
                  confidenceCount++;
                  usedOCR = true;
                }
              } catch (imgError) {
                console.error(`[OCR] Failed to process image on page ${pageNum}:`, imgError);
                // Continue with next image
              }
            }
          }
          
          // If no text extracted from images, use native text if available
          if (allText.length === 0 && nativeText.length > 0) {
            allText.push(`--- Page ${pageNum} ---\n${nativeText}`);
            totalConfidence += 100;
            confidenceCount++;
            usedNative = true;
          }
        } catch (pageError) {
          console.error(`[OCR] Error processing scanned page ${pageNum}:`, pageError);
          // Try to use native text as fallback
          if (nativeText.length > 0) {
            allText.push(`--- Page ${pageNum} ---\n${nativeText}`);
            totalConfidence += 100;
            confidenceCount++;
            usedNative = true;
          }
        }
      } else if (nativeText.length > 0) {
        // No images but has some text
        allText.push(`--- Page ${pageNum} ---\n${nativeText}`);
        totalConfidence += 100;
        confidenceCount++;
        usedNative = true;
      } else {
        console.log(`[OCR] Page ${pageNum}: No text or images found (blank page)`);
      }
    }
  }

  const combinedText = allText.join('\n\n').trim();
  const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
  
  let extractionMethod: 'native' | 'ocr' | 'hybrid' = 'native';
  if (usedOCR && usedNative) {
    extractionMethod = 'hybrid';
  } else if (usedOCR) {
    extractionMethod = 'ocr';
  }

    console.log(`[OCR] PDF extraction complete. Pages: ${pageCount}, Text length: ${combinedText.length}, Method: ${extractionMethod}, Avg confidence: ${avgConfidence.toFixed(1)}%`);

    return { 
      text: combinedText, 
      confidence: avgConfidence,
      pageCount,
      extractionMethod
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[OCR] PDF extraction failed: ${errorMsg}`, error);
    throw new Error(`Failed to extract text from PDF: ${errorMsg}`);
  }
}

// ============================================
// MAIN OCR FUNCTION
// ============================================

/**
 * Extracts text from images and PDFs using OCR (Tesseract.js)
 * For PDFs with native text, extracts text directly without OCR.
 * For scanned PDFs, uses OCR on embedded images.
 * 
 * @param buffer - The file buffer to process
 * @param fileType - The MIME type or file extension (e.g., 'image/png', '.pdf', 'application/pdf')
 * @returns Promise<OCRResult> - Result with extracted text and metadata
 * 
 * @example
 * const result = await extractTextWithOCR(pdfBuffer, 'application/pdf');
 * if (result.success) {
 *   console.log('Extracted text:', result.extractedText);
 *   console.log('Confidence:', result.confidence);
 *   console.log('Method:', result.extractionMethod); // 'native', 'ocr', or 'hybrid'
 * }
 */
export async function extractTextWithOCR(buffer: Buffer, fileType: string): Promise<OCRResult> {
  const startTime = Date.now();
  
  console.log(`[OCR] extractTextWithOCR called with fileType: ${fileType}, buffer size: ${buffer?.length || 0}`);

  // Validate file
  const validation = validateFile(buffer, fileType);
  if (!validation.valid) {
    console.warn(`[OCR] Validation failed: ${validation.error}`);
    return {
      success: false,
      extractedText: '',
      fileType: validation.type,
      processingTimeMs: Date.now() - startTime,
      message: 'File validation failed',
      error: validation.error || 'Unknown validation error',
    };
  }

  try {
    let extractedText = '';
    let confidence = 0;
    let pageCount: number | undefined;
    let extractionMethod: 'native' | 'ocr' | 'hybrid' | undefined;

    if (validation.type === 'image') {
      // Process image with Tesseract.js
      const result = await extractTextFromImage(buffer);
      extractedText = result.text;
      confidence = result.confidence;
      extractionMethod = 'ocr';
    } else if (validation.type === 'pdf') {
      // Process PDF - extract native text or OCR embedded images
      const result = await extractTextFromPdf(buffer);
      extractedText = result.text;
      confidence = result.confidence;
      pageCount = result.pageCount;
      extractionMethod = result.extractionMethod;
    }

    const processingTimeMs = Date.now() - startTime;

    // Log the OCR action for audit trail
    console.log(`[OCR] Text extraction completed in ${processingTimeMs}ms. Text length: ${extractedText.length}`);

    if (!extractedText || extractedText.length === 0) {
      return {
        success: false,
        extractedText: '',
        confidence: 0,
        fileType: validation.type,
        processingTimeMs,
        ...(pageCount !== undefined && { pageCount }),
        ...(extractionMethod && { extractionMethod }),
        message: 'No text could be extracted from the file',
        error: 'Extraction returned empty result - file may be blank or contain unreadable content',
      };
    }

    return {
      success: true,
      extractedText,
      confidence: Math.round(confidence * 10) / 10,
      fileType: validation.type,
      processingTimeMs,
      ...(pageCount !== undefined && { pageCount }),
      ...(extractionMethod && { extractionMethod }),
      message: `Successfully extracted ${extractedText.length} characters from ${validation.type}${pageCount ? ` (${pageCount} pages)` : ''}`,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[OCR] Error during text extraction:', {
      message: errorMessage,
      stack: errorStack,
      fileType: validation.type
    });

    return {
      success: false,
      extractedText: '',
      fileType: validation.type,
      processingTimeMs: Date.now() - startTime,
      message: 'Text extraction failed',
      error: errorMessage || 'Unknown error',
    };
  }
}

// Export types for use in other modules
export type { SupportedFileType };