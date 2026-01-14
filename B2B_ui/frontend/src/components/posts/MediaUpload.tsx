'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ImageIcon, 
  Video, 
  X, 
  PlayCircle, 
  FileImage,
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateFile } from '@/lib/validations/posts';
import { 
  fileToMediaFile, 
  formatFileSize, 
  isImageFile,
  isVideoFile 
} from '@/lib/utils/mediaHelpers';
import type { MediaFile } from '@/types/posts';

interface MediaUploadProps {
  mediaFiles: MediaFile[];
  onUpload: (files: MediaFile[]) => void;
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  mediaFiles,
  onUpload,
  maxFiles = 5,
  accept = "image/*,video/*",
  disabled = false,
  className = '',
}) => {
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = useCallback((files: File[]) => {
    setUploadErrors([]);
    const newMediaFiles: MediaFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Check if we've reached the max file limit
      if (mediaFiles.length + newMediaFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        errors.push(...validation.errors);
        continue;
      }

      // Convert to MediaFile
      const mediaFile = fileToMediaFile(file);
      newMediaFiles.push(mediaFile);
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    if (newMediaFiles.length > 0) {
      onUpload([...mediaFiles, ...newMediaFiles]);
    }
  }, [mediaFiles, maxFiles, onUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  // Remove media file
  const removeMediaFile = useCallback((index: number) => {
    const fileToRemove = mediaFiles[index];
    if (fileToRemove) {
      // Cleanup blob URL
      URL.revokeObjectURL(fileToRemove.url);
    }
    
    const updatedFiles = mediaFiles.filter((_, i) => i !== index);
    onUpload(updatedFiles);
  }, [mediaFiles, onUpload]);

  const canAddMoreFiles = mediaFiles.length < maxFiles;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileInputChange}
        disabled={disabled || !canAddMoreFiles}
        className="hidden"
      />

      {/* Upload Errors */}
      <AnimatePresence>
        {uploadErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {uploadErrors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700">{error}</p>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Grid */}
      <AnimatePresence>
        {mediaFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {mediaFiles.map((media, index) => (
              <motion.div
                key={`${media.name}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="relative group bg-neutral-800 rounded-lg overflow-hidden"
              >
                {/* Media Preview */}
                <div className="aspect-square relative">
                  {isImageFile(media.file) ? (
                    <Image
                      src={media.url}
                      alt={media.name}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-700 flex flex-col items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-neutral-400 mb-2" />
                      <FileImage className="w-6 h-6 text-neutral-500" />
                    </div>
                  )}

                  {/* Remove Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMediaFile(index);
                    }}
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2 w-6 h-6 p-0 bg-black/70 hover:bg-black/90 border-0"
                  >
                    <X className="w-3 h-3 text-white" />
                  </Button>

                  {/* Video Overlay */}
                  {isVideoFile(media.file) && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="p-2 space-y-1">
                  <p className="text-xs text-neutral-300 truncate" title={media.name}>
                    {media.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(media.size)}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Upload Buttons */}
      {canAddMoreFiles && (
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*';
                fileInputRef.current.click();
              }
            }}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Add Photo
          </Button>
          
          <Button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'video/*';
                fileInputRef.current.click();
              }
            }}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Add Video
          </Button>
        </div>
      )}
      
      {!canAddMoreFiles && (
        <div className="text-center py-2">
          <p className="text-sm text-neutral-400">Maximum {maxFiles} files reached</p>
          <p className="text-xs text-neutral-500">Remove a file to add more</p>
        </div>
      )}
    </div>
  );
};