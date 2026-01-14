"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Loader2, AlertCircle, Plus, Edit, Trash2, Calendar, Building, FileText, ExternalLink } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setActiveSectionForm, deleteBusinessAchievementAction } from "@/store/slices/businessProfileSlice";
import { BusinessAchievementForm } from "./BusinessAchievementForm";
import type { BusinessProfile } from "@/types/auth";
import type { BusinessAchievement } from "@/lib/api/businessProfileSections";

interface BusinessAchievementsSectionProps {
  businessProfile: BusinessProfile | null;
  delay?: number;
  isLoading?: boolean;
  error?: string | null;
}

const getIconForType = (icon?: string) => {
  switch (icon) {
    case "medal": return "🏅";
    case "star": return "⭐";
    case "certificate": return "📜";
    case "crown": return "👑";
    case "ribbon": return "🎗️";
    default: return "🏆";
  }
};

const getCategoryColor = (category?: string) => {
  switch (category) {
    case "award": return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300";
    case "certification": return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300";
    case "recognition": return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300";
    case "milestone": return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300";
    default: return "bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300";
  }
};

export const BusinessAchievementsSection = ({ businessProfile, delay = 0.4, isLoading, error }: BusinessAchievementsSectionProps) => {
  const dispatch = useAppDispatch();
  const { sections, achievements, activeSectionForm, selectedProfile } = useAppSelector((state) => state.businessProfile);
  
  const [editingAchievement, setEditingAchievement] = useState<BusinessAchievement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const achievementsList = sections.achievements || [];
  const hasAchievements = achievementsList.length > 0;
  
  // Check if user is owner or admin to show edit controls
  const canEdit = businessProfile?.role === 'owner' || businessProfile?.role === 'admin';

  // Check if achievement form should be shown
  const showAchievementForm = activeSectionForm === 'achievements';

  const handleCreateAchievement = () => {
    setEditingAchievement(null);
    dispatch(setActiveSectionForm('achievements'));
  };

  const handleEditAchievement = (achievement: BusinessAchievement) => {
    setEditingAchievement(achievement);
    dispatch(setActiveSectionForm('achievements'));
  };

  const handleDeleteAchievement = async (achievementId: string) => {
    if (!selectedProfile?.profileId) return;
    
    try {
      await dispatch(deleteBusinessAchievementAction({
        profileId: selectedProfile.profileId,
        achievementId
      })).unwrap();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete achievement:', error);
    }
  };

  const handleCloseForm = () => {
    setEditingAchievement(null);
    dispatch(setActiveSectionForm(null));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!businessProfile) {
    return null;
  }

  // Don't render the section if no achievements exist
  if (!hasAchievements && !isLoading && !error) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-6 sm:p-8 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            Awards & Achievements {!isLoading && !error && hasAchievements && `(${achievementsList.length})`}
          </h2>
          
          {canEdit && hasAchievements && (
            <button
              onClick={handleCreateAchievement}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-purple-600/25"
            >
              <Plus className="h-4 w-4" />
              Add Achievement
            </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-500 dark:text-neutral-400">Loading achievements...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-neutral-500 dark:text-neutral-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-4" />
              <p>Failed to load achievements</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {achievementsList.map((achievement, index) => (
              <motion.div
                key={achievement.achievementId || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + (index * 0.1) }}
                className="group border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-800 dark:to-neutral-900"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-full flex items-center justify-center flex-shrink-0 text-2xl">
                      {getIconForType(achievement.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 text-lg">
                          {achievement.award_name}
                        </h3>
                        {canEdit && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleEditAchievement(achievement)}
                              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                              title="Edit achievement"
                            >
                              <Edit className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(achievement.achievementId)}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete achievement"
                            >
                              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {achievement.category && (
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${getCategoryColor(achievement.category)} mb-2`}>
                          {achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {achievement.description && (
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4 leading-relaxed">
                    {achievement.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  {achievement.date_received && (
                    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                      <Calendar className="h-4 w-4" />
                      <span>Received: {formatDate(achievement.date_received)}</span>
                    </div>
                  )}
                  
                  {achievement.awarding_organization && (
                    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                      <Building className="h-4 w-4" />
                      <span>by {achievement.awarding_organization}</span>
                    </div>
                  )}

                  {achievement.issuer && achievement.issuer !== achievement.awarding_organization && (
                    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                      <Award className="h-4 w-4" />
                      <span>Issued by: {achievement.issuer}</span>
                    </div>
                  )}
                </div>

                {achievement.certificateUrl && achievement.certificateUrl.length > 0 && (
                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Certificates
                    </h4>
                    <div className="space-y-1">
                      {achievement.certificateUrl.map((cert, certIndex) => (
                        <a
                          key={certIndex}
                          href={cert.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate">Certificate {certIndex + 1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Achievement Form Modal */}
      <BusinessAchievementForm
        isOpen={showAchievementForm}
        profileId={businessProfile.profileId}
        onClose={handleCloseForm}
        mode={editingAchievement ? "edit" : "create"}
        achievementData={editingAchievement}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Delete Achievement
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Are you sure you want to delete this achievement? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                disabled={achievements.deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAchievement(showDeleteConfirm)}
                disabled={achievements.deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
              >
                {achievements.deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};