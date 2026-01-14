import React from 'react';
import { UploadCloud, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadWidgetProps {
  fileName?: string;
  fileSize?: string;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  error?: string;
  focusRef?: React.RefObject<HTMLDivElement | null>;
}

const truncate = (s: string | undefined, n = 30): string => {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 3)}...` : s;
};

export const UploadWidget: React.FC<UploadWidgetProps> = ({
  fileName,
  fileSize,
  onFileSelect,
  onRemove,
  error,
  focusRef,
}) => {
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      document.getElementById('resume-file-input')?.click();
    }
  };

  const triggerFileInput = () => {
    document.getElementById('resume-file-input')?.click();
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        ref={focusRef}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-xl border-2 p-4 text-center transition-all cursor-pointer focus:outline-none ${
          error
            ? 'border-red-500 bg-gray-800/30'
            : 'border-gray-700 bg-gradient-to-b from-gray-800/30 to-gray-800/10 hover:border-indigo-500'
        }`}
        onClick={triggerFileInput}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          id="resume-file-input"
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileInput}
        />

        {fileName ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Check className="w-7 h-7 text-green-400" />
              <div className="text-left">
                <div className="font-medium text-white">{truncate(fileName)}</div>
                <div className="text-xs text-gray-400">{fileSize}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileInput();
                }}
              >
                Replace
              </Button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label="remove file"
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud className="w-10 h-10 text-indigo-400" />
            <p className="text-lg font-medium text-white">Upload or drop your resume</p>
            <p className="text-sm text-gray-400">PDF / DOCX / TXT · max 5MB</p>
            <div className="mt-2">
              <Button variant="ghost" onClick={triggerFileInput}>
                Browse files
              </Button>
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
};
