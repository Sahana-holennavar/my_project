/**
 * Multer Configuration for Chat Media Uploads
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

// Ensure temp upload directory exists
const tempUploadDir = config.CHAT_MEDIA_TEMP_UPLOAD_FOLDER;
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter - allowed media types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Videos
    'video/mp4',
    'video/quicktime',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported for chat media`));
  }
};

// Export multer upload instance
export const chatMediaUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.CHAT_MEDIA_MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
});
