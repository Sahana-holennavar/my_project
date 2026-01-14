import mammoth from 'mammoth';
import { config } from '../config/env';

const pdfParse = require('pdf-parse');

const MAX_FILE_SIZE = config.MAX_FILE_SIZE_MB * 1024 * 1024;

export const extractTextFromPDF = async (buffer: Buffer): Promise<string> => {
  try {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${config.MAX_FILE_SIZE_MB}MB`);
    }
    
    if (buffer.length === 0) {
      throw new Error('PDF file is empty');
    }
    
    const data = await pdfParse(buffer);
    
    if (!data || !data.text) {
      throw new Error('PDF file does not contain extractable text. The file might be a scanned image or corrupted.');
    }
    
    return data.text || '';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('bad XRef entry') || errorMessage.includes('XRef') || errorMessage.includes('xref')) {
      throw new Error('PDF file appears to be corrupted or has an invalid structure. Please ensure the PDF is not corrupted and try again. If the PDF is a scanned image, use OCR to extract text first.');
    }
    
    if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
      throw new Error('PDF file is password protected or encrypted. Please provide an unencrypted PDF file.');
    }
    
    if (errorMessage.includes('Invalid PDF') || errorMessage.includes('invalid')) {
      throw new Error('Invalid PDF file format. Please ensure the file is a valid PDF document.');
    }
    
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
};

export const extractTextFromDOCX = async (buffer: Buffer): Promise<string> => {
  try {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${config.MAX_FILE_SIZE_MB}MB`);
    }
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const extractTextFromTXT = async (buffer: Buffer): Promise<string> => {
  try {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${config.MAX_FILE_SIZE_MB}MB`);
    }
    return buffer.toString('utf-8');
  } catch (error) {
    throw new Error(`Failed to extract text from TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const extractTextFromFile = async (buffer: Buffer, fileType: string): Promise<string> => {
  const normalizedType = fileType.toLowerCase().replace('.', '');
  
  switch (normalizedType) {
    case 'pdf':
      return extractTextFromPDF(buffer);
    case 'docx':
      return extractTextFromDOCX(buffer);
    case 'doc':
      return extractTextFromDOCX(buffer);
    case 'txt':
      return extractTextFromTXT(buffer);
    default:
      throw new Error(`Unsupported file type for text extraction: ${fileType}`);
  }
};

