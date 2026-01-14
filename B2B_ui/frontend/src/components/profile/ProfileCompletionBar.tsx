'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { ProfileData } from '@/lib/api/profile';

interface ProfileCompletionBarProps {
  profile: ProfileData | null;
  userPostsCount: number;
}

interface CompletionItem {
  label: string;
  percentage: number;
  completed: boolean;
}

export const ProfileCompletionBar: React.FC<ProfileCompletionBarProps> = ({
  profile,
  userPostsCount,
}) => {
  // Calculate completion for each section
  const calculateCompletion = (): { total: number; items: CompletionItem[] } => {
    if (!profile) {
      return { total: 0, items: [] };
    }

    const items: CompletionItem[] = [];

    // 1. Profile Creation (10%) - Check all required fields
    const personalInfo = profile.personal_information;
    
    // Helper function to check if field is filled
    const isFieldFilled = (field: string | undefined | null): boolean => {
      return !!field && typeof field === 'string' && field.trim().length > 0;
    };
    
    const requiredFields = [
      { name: 'first_name', value: personalInfo?.first_name },
      { name: 'last_name', value: personalInfo?.last_name },
      { name: 'email', value: personalInfo?.email },
      { name: 'phone_number', value: personalInfo?.phone_number },
      { name: 'date_of_birth', value: personalInfo?.date_of_birth },
      { name: 'gender', value: personalInfo?.gender },
      { name: 'profession', value: personalInfo?.profession }, // Now required
      { name: 'country', value: personalInfo?.country },
      { name: 'state_province', value: personalInfo?.state_province },
      { name: 'city', value: personalInfo?.city },
    ];
    
    const allFieldsFilled = requiredFields.every(field => isFieldFilled(field.value));
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      const missingFields = requiredFields.filter(f => !isFieldFilled(f.value)).map(f => f.name);
      if (missingFields.length > 0) {
        console.log('[ProfileCompletionBar] Missing required fields:', missingFields);
        console.log('[ProfileCompletionBar] Personal info:', personalInfo);
      }
    }
    items.push({
      label: 'Profile Creation',
      percentage: 10,
      completed: allFieldsFilled,
    });

    // 2. Experience (20%)
    const hasExperience = !!(profile.experience && profile.experience.length > 0);
    items.push({
      label: 'Experience',
      percentage: 20,
      completed: hasExperience,
    });

    // 3. Skills (20%)
    const hasSkills = !!(profile.skills && profile.skills.length > 0);
    items.push({
      label: 'Skills',
      percentage: 20,
      completed: hasSkills,
    });

    // 4. Awards (10%)
    const hasAwards = !!(profile.awards && profile.awards.length > 0);
    items.push({
      label: 'Awards',
      percentage: 10,
      completed: hasAwards,
    });

    // 5. Projects (10%)
    const hasProjects = !!(profile.projects && profile.projects.length > 0);
    items.push({
      label: 'Projects',
      percentage: 10,
      completed: hasProjects,
    });

    // 6. Certifications (10%) - Previously "Achievements"
    const hasCertifications = !!(profile.certifications && profile.certifications.length > 0);
    items.push({
      label: 'Certifications',
      percentage: 10,
      completed: hasCertifications,
    });

    // 7. Avatars & Banners (10%)
    const hasAvatar = !!profile.avatar?.fileUrl;
    const hasBanner = !!profile.banner?.fileUrl;
    const hasBothMedia = hasAvatar && hasBanner;
    items.push({
      label: 'Avatars & Banners',
      percentage: 10,
      completed: hasBothMedia,
    });

    // 8. First Post (10%)
    const hasPost = userPostsCount > 0;
    items.push({
      label: 'First Post',
      percentage: 10,
      completed: hasPost,
    });

    // Calculate total percentage
    const total = items.reduce((sum, item) => sum + (item.completed ? item.percentage : 0), 0);

    return { total, items };
  };

  const { total, items } = calculateCompletion();

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[ProfileCompletionBar] Total completion:', total + '%');
    console.log('[ProfileCompletionBar] Items:', items);
    console.log('[ProfileCompletionBar] User posts count:', userPostsCount);
  }

  // Don't show the bar if profile is 100% complete
  if (total === 100) {
    return null;
  }
  
  // Always show the bar if total is less than 100% (even if 0%)
  // This ensures visibility when profile is incomplete

  const completedCount = items.filter(item => item.completed).length;
  const totalItems = items.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-6 mb-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white">
            Profile Completion
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Complete your profile to unlock more features
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
            {total}%
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {completedCount} of {totalItems} sections completed
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-3 sm:h-4 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${total}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-500 dark:to-purple-400 rounded-full"
        />
      </div>

      {/* Breakdown Section */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-2">
          <span>View breakdown</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 group-open:hidden">▼</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden group-open:inline">▲</span>
        </summary>
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  item.completed
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-neutral-50 dark:bg-neutral-800/50'
                }`}
              >
                {item.completed ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      item.completed
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {item.percentage}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </motion.div>
  );
};

