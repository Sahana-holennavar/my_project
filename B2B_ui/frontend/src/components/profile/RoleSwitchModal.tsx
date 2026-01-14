import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

type RoleSwitchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentRole: 'student' | 'professional';
  targetRole: 'student' | 'professional';
  message?: string;
  onConfirmSwitch: () => void;
  isLoading?: boolean;
};

const RoleSwitchModal = ({
  isOpen,
  onClose,
  currentRole,
  targetRole,
  message,
  onConfirmSwitch,
  isLoading = false,
}: RoleSwitchModalProps) => {
  const defaultMessage = `This option is only available for ${targetRole === 'professional' ? 'Professionals' : 'Students'}. Would you like to switch your role?`;
  
  const displayMessage = message || defaultMessage;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl transition-colors overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-brand-gray-200 dark:border-neutral-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-brand-gray-900 dark:text-white">
                      Role Restriction
                    </h3>
                    <p className="text-sm text-brand-gray-500 dark:text-neutral-400 mt-0.5">
                      Current role: <span className="font-semibold capitalize">{currentRole}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-brand-gray-400 dark:text-neutral-500 hover:text-brand-gray-900 dark:hover:text-white rounded-lg hover:bg-brand-gray-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-brand-gray-700 dark:text-neutral-300 leading-relaxed">
                {displayMessage}
              </p>

              {/* Role Switch Info */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-brand-gray-600 dark:text-neutral-400">Switch from</p>
                    <p className="font-semibold text-brand-gray-900 dark:text-white capitalize mt-0.5">
                      {currentRole}
                    </p>
                  </div>
                  <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-brand-gray-600 dark:text-neutral-400">Switch to</p>
                    <p className="font-semibold text-brand-gray-900 dark:text-white capitalize mt-0.5">
                      {targetRole}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Note */}
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  <strong>Note:</strong> Switching roles will update your profile visibility and available sections.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-brand-gray-50 dark:bg-neutral-950 border-t border-brand-gray-200 dark:border-neutral-800 flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-full bg-white dark:bg-neutral-800 border border-brand-gray-300 dark:border-neutral-700 text-brand-gray-700 dark:text-neutral-300 hover:bg-brand-gray-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmSwitch}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Switching...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Switch Role
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoleSwitchModal;
