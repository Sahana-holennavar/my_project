import { config } from '../config/env';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const MAX_FILE_SIZE = config.MAX_FILE_SIZE_MB * 1024 * 1024;

const EXTENSION_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const EXECUTABLE_SIGNATURES = [
  Buffer.from('MZ'),
  Buffer.from('PK'),
  Buffer.from('\x7fELF'),
  Buffer.from('#!'),
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedMimeType?: string;
}

export const validateResumeUploadFile = (
  fileBuffer: Buffer,
  fileType: string
): ValidationResult => {
  if (!fileBuffer || fileBuffer.length === 0) {
    return {
      isValid: false,
      error: 'File buffer is empty or invalid',
    };
  }

  const fileExtension = fileType.toLowerCase().startsWith('.')
    ? fileType.toLowerCase()
    : `.${fileType.toLowerCase()}`;

  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    const maxSizeMB = config.MAX_FILE_SIZE_MB;
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  const expectedMimeType = EXTENSION_TO_MIME[fileExtension];
  if (!expectedMimeType) {
    return {
      isValid: false,
      error: 'Unsupported file type',
    };
  }

  const detectedMimeType = detectMimeTypeFromBuffer(fileBuffer);
  if (detectedMimeType && !ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
    return {
      isValid: false,
      error: 'File content does not match declared file type',
    };
  }

  if (isExecutableFile(fileBuffer)) {
    return {
      isValid: false,
      error: 'Executable files are not allowed',
    };
  }

  return {
    isValid: true,
    detectedMimeType: detectedMimeType || expectedMimeType,
  };
};

const detectMimeTypeFromBuffer = (buffer: Buffer): string | null => {
  if (buffer.length < 4) return null;

  const header = buffer.slice(0, 4);

  if (buffer.slice(0, 4).toString('hex').startsWith('25504446')) {
    return 'application/pdf';
  }

  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  if (buffer.slice(0, 2).toString() === 'PK') {
    const zipHeader = buffer.slice(0, 4);
    if (zipHeader[2] === 0x03 && zipHeader[3] === 0x04) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
  }

  if (buffer.slice(0, 4).toString().includes('%PDF')) {
    return 'application/pdf';
  }

  if (buffer.slice(0, 2).toString() === 'MZ') {
    return null;
  }

  const textStart = buffer.slice(0, 100).toString('utf-8');
  if (/^[\x20-\x7E\s]*$/.test(textStart)) {
    return 'text/plain';
  }

  return null;
};

const isExecutableFile = (buffer: Buffer): boolean => {
  if (buffer.length < 2) return false;

  for (const signature of EXECUTABLE_SIGNATURES) {
    if (buffer.slice(0, signature.length).equals(signature)) {
      if (signature.equals(Buffer.from('PK'))) {
        const zipHeader = buffer.slice(0, 4);
        if (zipHeader[2] === 0x03 && zipHeader[3] === 0x04) {
          continue;
        }
      }
      if (signature.equals(Buffer.from('MZ'))) {
        return true;
      }
      if (signature.equals(Buffer.from('\x7fELF'))) {
        return true;
      }
      if (signature.equals(Buffer.from('#!'))) {
        return true;
      }
    }
  }

  return false;
};

export const getFileExtension = (fileType: string): string => {
  return fileType.toLowerCase().startsWith('.')
    ? fileType.toLowerCase()
    : `.${fileType.toLowerCase()}`;
};

export const generateUniqueFileName = (userId: string, fileType: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(fileType);
  return `${userId}_${timestamp}_${randomString}${extension}`;
};

