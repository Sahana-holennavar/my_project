"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Calendar, MapPin, Loader2, AlertCircle, Trash2, X, Edit } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteBusinessAboutSection, updateBusinessAboutSection } from "@/store/slices/businessProfileSlice";
import type { BusinessProfile } from "@/types/auth";

interface BusinessAboutSectionProps {
  businessProfile: BusinessProfile | null;
  delay?: number;
  isLoading?: boolean;
  error?: string | null;
}

export const BusinessAboutSection = ({ businessProfile, delay = 0.1, isLoading, error }: BusinessAboutSectionProps) => {
  const dispatch = useAppDispatch();
  const { deletingSections, addingSections } = useAppSelector((state) => state.businessProfile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    description: '',
    mission: '',
    vision: '',
    core_values: '',
    founder_message: '',
    founded: '',
    employees: '',
    headquarters: ''
  });
  
  const companyData = businessProfile?.companyProfileData;
  
  // Check if about section has meaningful data
  const hasAboutData = companyData?.about && (
    companyData.about.description ||
    companyData.about.mission ||
    companyData.about.vision ||
    companyData.about.core_values ||
    companyData.about.founder_message ||
    companyData.about.founded ||
    companyData.about.headquarters
  );
  
  const handleDeleteSection = async () => {
    if (businessProfile?.profileId) {
      try {
        await dispatch(deleteBusinessAboutSection(businessProfile.profileId)).unwrap();
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('Failed to delete about section:', error);
        setShowDeleteConfirm(false);
      }
    }
  };
  
  const handleEditSection = () => {
    if (companyData?.about) {
      setEditFormData({
        description: companyData.about.description || '',
        mission: companyData.about.mission || '',
        vision: companyData.about.vision || '',
        core_values: companyData.about.core_values || '',
        founder_message: companyData.about.founder_message || '',
        founded: companyData.about.founded || '',
        employees: companyData.about.employees || '',
        headquarters: companyData.about.headquarters || ''
      });
      setShowEditModal(true);
    }
  };
  
  const handleUpdateSection = async () => {
    if (businessProfile?.profileId) {
      try {
        await dispatch(updateBusinessAboutSection({
          profileId: businessProfile.profileId,
          aboutData: editFormData
        })).unwrap();
        setShowEditModal(false);
      } catch (error) {
        console.error('Failed to update about section:', error);
      }
    }
  };
  
  const handleInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Don't render if no data available and not loading
  if (!isLoading && !error && !hasAboutData) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            About Us
          </h2>
          
          {hasAboutData && !isLoading && (businessProfile?.role === 'owner' || businessProfile?.role === 'admin') && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditSection}
                disabled={addingSections.about}
                className="p-2 text-neutral-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit About Section"
              >
                <Edit className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deletingSections.about}
                className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete About Section"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-purple-600 dark:text-purple-400" />
              <p className="text-neutral-600 dark:text-neutral-400">Loading about section...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {!isLoading && !error && hasAboutData && (
          <>
            {companyData.about.description && (
              <div className="mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">About Our Company</h3>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">{companyData.about.description}</p>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {companyData.about.mission && (
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Mission</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">{companyData.about.mission}</p>
                </div>
              )}
              {companyData.about.vision && (
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Vision</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">{companyData.about.vision}</p>
                </div>
              )}
              {companyData.about.core_values && (
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Core Values</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">{companyData.about.core_values}</p>
                </div>
              )}
              {companyData.about.founded && (
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Founded</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {companyData.about.founded}
                  </p>
                </div>
              )}
              {companyData.about.headquarters && (
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Headquarters</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {companyData.about.headquarters}
                  </p>
                </div>
              )}
            </div>
            {companyData.about.founder_message && (
              <div className="mt-6 p-6 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Founder&apos;s Message</h3>
                <p className="text-neutral-600 dark:text-neutral-400 italic">&ldquo;{companyData.about.founder_message}&rdquo;</p>
              </div>
            )}
          </>
        )}
      </motion.div>
      
      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !addingSections.about && setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl mx-auto max-h-[80vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Edit className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Edit About Section
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Update your company information
                    </p>
                  </div>
                </div>
                {!addingSections.about && (
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Company Description
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your company..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-neutral-800 dark:text-white resize-none"
                    rows={4}
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Mission
                    </label>
                    <textarea
                      value={editFormData.mission}
                      onChange={(e) => handleInputChange('mission', e.target.value)}
                      placeholder="Company mission..."
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-neutral-800 dark:text-white resize-none"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Vision
                    </label>
                    <textarea
                      value={editFormData.vision}
                      onChange={(e) => handleInputChange('vision', e.target.value)}
                      placeholder="Company vision..."
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-neutral-800 dark:text-white resize-none"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Core Values
                  </label>
                  <textarea
                    value={editFormData.core_values}
                    onChange={(e) => handleInputChange('core_values', e.target.value)}
                    placeholder="Company core values..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-neutral-800 dark:text-white resize-none"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Founder&apos;s Message
                  </label>
                  <textarea
                    value={editFormData.founder_message}
                    onChange={(e) => handleInputChange('founder_message', e.target.value)}
                    placeholder="Message from the founder..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-neutral-800 dark:text-white resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Founded
                    </label>
                    <input
                      type="text"
                      value={editFormData.founded}
                      onChange={(e) => handleInputChange('founded', e.target.value)}
                      placeholder="e.g., 2020"
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-neutral-800 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Employees
                    </label>
                    <input
                      type="text"
                      value={editFormData.employees}
                      onChange={(e) => handleInputChange('employees', e.target.value)}
                      placeholder="e.g., 50-100"
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-neutral-800 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Headquarters
                    </label>
                    <input
                      type="text"
                      value={editFormData.headquarters}
                      onChange={(e) => handleInputChange('headquarters', e.target.value)}
                      placeholder="e.g., Mumbai, India"
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-neutral-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={addingSections.about}
                  className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSection}
                  disabled={addingSections.about}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[120px] justify-center"
                >
                  {addingSections.about ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      Update Section
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !deletingSections.about && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md mx-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Delete About Section
                    </h3>
                    </div>
                </div>
                {!deletingSections.about && (
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* Modal Body */}
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    Are you sure you want to delete the <span className="font-semibold text-neutral-900 dark:text-white">About Us</span> section? 
                    This will permanently remove all information including:
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
                      Company description and mission
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
                      Vision and core values
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
                      Founder message and company details
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingSections.about}
                  className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSection}
                  disabled={deletingSections.about}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[120px] justify-center"
                >
                  {deletingSections.about ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Section
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};