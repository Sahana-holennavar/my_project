"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, FolderOpen, Award } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { 
  closeAddSectionsModal, 
  setActiveSectionForm,
  type BusinessProfileState 
} from "@/store/slices/businessProfileSlice";

interface AddSectionsModalProps {
  isOpen: boolean;
}

export const AddSectionsModal = ({ isOpen }: AddSectionsModalProps) => {
  const dispatch = useAppDispatch();
  const { 
    activeSectionForm, 
    selectedProfile, 
    sections: profileSections 
  } = useAppSelector((state: { businessProfile: BusinessProfileState }) => state.businessProfile);

  const handleClose = () => {
    dispatch(closeAddSectionsModal());
  };

  const handleSectionSelect = (section: "about" | "projects" | "achievements") => {
    dispatch(setActiveSectionForm(section));
    // dispatch(closeAddSectionsModal());
  };

  // Check if sections already exist
  const hasAboutSection = Boolean(profileSections?.about && (
    profileSections.about.description ||
    profileSections.about.mission ||
    profileSections.about.vision ||
    profileSections.about.core_values ||
    profileSections.about.founder_message ||
    profileSections.about.founded ||
    profileSections.about.headquarters
  ));

  const hasProjectsSection = Boolean(profileSections?.projects && 
    Array.isArray(profileSections.projects) && 
    profileSections.projects.length > 0);

  const hasAchievementsSection = Boolean(profileSections?.achievements && 
    Array.isArray(profileSections.achievements) && 
    profileSections.achievements.length > 0);

  const sections = [
    {
      id: "about" as const,
      title: "About Section",
      description: hasAboutSection 
        ? "About section already exists" 
        : "Add company description, mission, vision, and core values",
      icon: Building2,
      disabled: hasAboutSection,
      buttonClass: hasAboutSection 
        ? "border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed"
        : "border-neutral-200 dark:border-neutral-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 cursor-pointer",
      iconClass: hasAboutSection
        ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
        : "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    },
    {
      id: "projects" as const,
      title: "Projects",
      description: hasProjectsSection 
        ? "Projects section already exists" 
        : "Showcase your company's key projects and case studies",
      icon: FolderOpen,
      disabled: hasProjectsSection,
      buttonClass: hasProjectsSection 
        ? "border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed"
        : "border-neutral-200 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer",
      iconClass: hasProjectsSection
        ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
        : "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    },
    {
      id: "achievements" as const,
      title: "Achievements",
      description: hasAchievementsSection 
        ? "Achievements section already exists" 
        : "Highlight awards, certifications, and milestones",
      icon: Award,
      disabled: hasAchievementsSection,
      buttonClass: hasAchievementsSection 
        ? "border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed"
        : "border-neutral-200 dark:border-neutral-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 cursor-pointer",
      iconClass: hasAchievementsSection
        ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
        : "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    },
  ];

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
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    Add Profile Section
                  </h2>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <X className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
                  </button>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                  Choose a section to add to your business profile
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-4">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    
                    return (
                      <button
                        key={section.id}
                        onClick={() => !section.disabled && handleSectionSelect(section.id)}
                        disabled={section.disabled}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 ${section.buttonClass}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${section.iconClass}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold mb-1 ${
                              section.disabled
                                ? "text-neutral-500 dark:text-neutral-400"
                                : "text-neutral-900 dark:text-white"
                            }`}>
                              {section.title}
                              {section.disabled && (
                                <span className="text-xs text-neutral-400 ml-2 font-normal">
                                  (Already exists)
                                </span>
                              )}
                            </h3>
                            <p className={`text-sm ${
                              section.disabled
                                ? "text-neutral-400 dark:text-neutral-500"
                                : "text-neutral-600 dark:text-neutral-400"
                            }`}>
                              {section.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};