"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, AlertCircle, Loader2, Eye, EyeOff, Save, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createBusinessPrivateInfoAction,
  updateBusinessPrivateInfoAction,
  deleteBusinessPrivateInfoAction,
  fetchBusinessPrivateInfo
} from "@/store/slices/businessProfileSlice";
import type { BusinessPrivateInfo } from "@/lib/api/businessProfileSections";

interface BusinessPrivateInfoFormProps {
  isOpen: boolean;
  profileId: string;
  onClose: () => void;
}

export const BusinessPrivateInfoForm = ({ isOpen, profileId, onClose }: BusinessPrivateInfoFormProps) => {
  const dispatch = useAppDispatch();
  const { sections, privateInfo, sectionErrors } = useAppSelector((state) => state.businessProfile);
  
  const [formData, setFormData] = useState({
    taxId: '',
    ein: '',
    legalName: '',
    bankDetails: {
      accountNumber: '',
      routingNumber: '',
      bankName: ''
    }
  });
  
  const [files, setFiles] = useState<{
    registration_certificate?: File;
    business_license?: File;
  }>({});
  
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const existingPrivateInfo = sections.privateInfo;
  const isLoading = privateInfo.creating || privateInfo.updating || privateInfo.deleting;

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && profileId) {
      if (!existingPrivateInfo) {
        dispatch(fetchBusinessPrivateInfo(profileId));
      } else {
        setFormData({
          taxId: existingPrivateInfo.taxId || '',
          ein: existingPrivateInfo.ein || '',
          legalName: existingPrivateInfo.legalName || '',
          bankDetails: {
            accountNumber: existingPrivateInfo.bankDetails?.accountNumber || '',
            routingNumber: existingPrivateInfo.bankDetails?.routingNumber || '',
            bankName: existingPrivateInfo.bankDetails?.bankName || ''
          }
        });
        setIsEditing(true);
      }
    }
  }, [isOpen, profileId, existingPrivateInfo, dispatch]);

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('bankDetails.')) {
      const bankField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [bankField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleFileChange = (field: 'registration_certificate' | 'business_license', file: File | null) => {
    setFiles(prev => ({
      ...prev,
      [field]: file || undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileId) return;

    try {
      const submitData = {
        profileId,
        privateInfoData: {
          ...formData,
          registration_certificate: files.registration_certificate,
          business_license: files.business_license
        }
      };

      if (isEditing) {
        await dispatch(updateBusinessPrivateInfoAction(submitData)).unwrap();
      } else {
        await dispatch(createBusinessPrivateInfoAction(submitData)).unwrap();
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save private info:', error);
    }
  };

  const handleDelete = async () => {
    if (!profileId || !window.confirm('Are you sure you want to delete all private information? This action cannot be undone.')) {
      return;
    }

    try {
      await dispatch(deleteBusinessPrivateInfoAction(profileId)).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to delete private info:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      taxId: '',
      ein: '',
      legalName: '',
      bankDetails: { accountNumber: '', routingNumber: '', bankName: '' }
    });
    setFiles({});
    setShowSensitiveFields(false);
    setIsEditing(false);
    onClose();
  };

  const renderFileUpload = (
    field: 'registration_certificate' | 'business_license',
    label: string,
    currentFile?: { fileUrl: string; filename: string }
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-900 dark:text-white">
        {label}
      </label>
      <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-4">
        {currentFile && !files[field] ? (
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-neutral-500" />
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {currentFile.filename}
                </p>
                <a
                  href={currentFile.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  View Document
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById(`${field}-input`)?.click()}
              className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Replace
            </button>
          </div>
        ) : files[field] ? (
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {files[field]!.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {(files[field]!.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleFileChange(field, null)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              Click to upload {label.toLowerCase()}
            </p>
            <button
              type="button"
              onClick={() => document.getElementById(`${field}-input`)?.click()}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Choose File
            </button>
          </div>
        )}
        <input
          id={`${field}-input`}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(field, file);
          }}
          className="hidden"
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-xl">
                      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                        Private Information
                      </h2>
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        Owner Only - Confidential Data
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {existingPrivateInfo && (
                      <button
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
                        title="Delete all private information"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                      <X className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Error Display */}
                  {sectionErrors.privateInfo && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {sectionErrors.privateInfo}
                      </p>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Legal Company Name *
                      </label>
                      <input
                        type="text"
                        value={formData.legalName}
                        onChange={(e) => handleInputChange('legalName', e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                        placeholder="Enter legal company name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        EIN (Employer ID Number) *
                      </label>
                      <input
                        type="text"
                        value={formData.ein}
                        onChange={(e) => handleInputChange('ein', e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                        placeholder="XX-XXXXXXX"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Tax ID *
                      </label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => handleInputChange('taxId', e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                        placeholder="XX-XXXXXXX"
                        required
                      />
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Bank Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowSensitiveFields(!showSensitiveFields)}
                        className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                      >
                        {showSensitiveFields ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Show Details
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={formData.bankDetails.bankName}
                          onChange={(e) => handleInputChange('bankDetails.bankName', e.target.value)}
                          className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                          placeholder="Enter bank name"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                          Account Number *
                        </label>
                        <input
                          type={showSensitiveFields ? "text" : "password"}
                          value={formData.bankDetails.accountNumber}
                          onChange={(e) => handleInputChange('bankDetails.accountNumber', e.target.value)}
                          className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                          placeholder="Enter account number"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                          Routing Number *
                        </label>
                        <input
                          type={showSensitiveFields ? "text" : "password"}
                          value={formData.bankDetails.routingNumber}
                          onChange={(e) => handleInputChange('bankDetails.routingNumber', e.target.value)}
                          className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                          placeholder="Enter routing number"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Uploads */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {renderFileUpload(
                      'registration_certificate',
                      'Registration Certificate',
                      existingPrivateInfo?.registration_certificate
                    )}
                    {renderFileUpload(
                      'business_license',
                      'Business License',
                      existingPrivateInfo?.business_license
                    )}
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-6 py-2.5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[140px] justify-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {privateInfo.creating ? 'Creating...' : 
                         privateInfo.updating ? 'Updating...' : 
                         privateInfo.deleting ? 'Deleting...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {isEditing ? 'Update' : 'Create'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};