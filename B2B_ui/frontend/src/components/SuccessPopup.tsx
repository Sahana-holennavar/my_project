"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessPopupProps {
  isOpen: boolean;
  message: string;
  description?: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export const SuccessPopup: React.FC<SuccessPopupProps> = ({
  isOpen,
  message,
  description,
  onClose,
  actionLabel = "Continue",
  onAction,
}) => {
  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                {message}
              </h2>
              {description && (
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  {description}
                </p>
              )}
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleAction}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 min-w-[120px]"
              >
                {actionLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};