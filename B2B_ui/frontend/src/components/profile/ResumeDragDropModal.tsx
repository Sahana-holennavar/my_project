import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const modalContentVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as import('framer-motion').AnimationGeneratorType, damping: 25, stiffness: 200 } },
  exit: { opacity: 0, y: -50 },
};

export type ResumeDragDropModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
};

const ResumeDragDropModal: React.FC<ResumeDragDropModalProps> = ({ isOpen, onClose, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const allowedExtensions = ['.pdf', '.doc', '.docx'];

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        setError('Only PDF, DOC, or DOCX files are allowed.');
        return;
      }
      setError(null);
      onUpload(file);
      onClose();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        setError('Only PDF, DOC, or DOCX files are allowed.');
        return;
      }
      setError(null);
      onUpload(file);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalContentVariants}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-xl p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Upload Resume (PDF)</h2>
              <button className="p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white" onClick={onClose}>
                <X size={22} />
              </button>
            </div>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800'}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Drag & drop your resume here</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">or click to select a file</p>
              <p className="text-xs text-neutral-400">Only PDF, DOC, or DOCX files are allowed</p>
            </div>
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResumeDragDropModal;
