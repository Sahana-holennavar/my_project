'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResumeUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please upload PDF, DOC, or DOCX file',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB. Current size: ${fileSizeMB}MB`,
    };
  }

  return { isValid: true };
}

export function ResumeUpload({ value, onChange, error }: ResumeUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setUploadError(null);

      if (!file) {
        return;
      }

      const validation = validateFile(file);
      if (!validation.isValid) {
        setUploadError(validation.error || 'Invalid file');
        event.target.value = '';
        return;
      }

      setUploading(true);
      setTimeout(() => {
        onChange(file);
        setUploading(false);
      }, 500);
    },
    [onChange]
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const displayError = error || uploadError;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Resume <span className="text-red-500">*</span>
      </label>

      {!value ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Resume
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800">
          <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {value.name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatFileSize(value.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadClick}
            className="flex-shrink-0"
          >
            Change
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {displayError && (
        <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Accepted formats: PDF, DOC, DOCX (Max 5MB)
      </p>
    </div>
  );
}

