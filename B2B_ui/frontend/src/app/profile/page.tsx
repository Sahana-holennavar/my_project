"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProfile, openHeroModal, openAddSectionsModal } from "@/store/slices/profileSlice";
import { HeroSectionModal } from "@/components/profile/HeroSectionModal";
import { AddSectionsModal } from "@/components/profile/AddSectionsModal";
import ProfileHeroPlugPlay from "@/components/profile/ProfileHeroPlugPlay";
import { ProfileCompletionBar } from "@/components/profile/ProfileCompletionBar";
import AboutSection from "@/components/profile/AboutSection";
import EducationSection from "@/components/profile/EducationSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import SkillsSection from "@/components/profile/SkillsSection";
import ProjectsSection from "@/components/profile/ProjectsSection";
import AwardsSection from "@/components/profile/AwardsSection";
import CertificationsSection from "@/components/profile/CertificationsSection";
import { UserTutorial } from "@/components/common/UserTutorial";
import { updateHeroSection } from "@/lib/api/profile";
import { checkTokenExpiration } from "@/lib/utils/authErrorHandler";
import { postsApi } from "@/lib/api";
import type { About } from "@/lib/api/profile";
import { motion } from "framer-motion";
import {
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/styles/tutorial.css";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { profile, isPartial, loading, error } = useAppSelector(
    (state) => state.profile
  );
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  // State for user posts count
  const [userPostsCount, setUserPostsCount] = useState(0);

  // Check token expiration on mount and periodically
  useEffect(() => {
    // Check on mount
    if (checkTokenExpiration(dispatch, router)) {
      return; // Token was expired, user will be redirected
    }

    // Check periodically (every 30 seconds)
    const interval = setInterval(() => {
      checkTokenExpiration(dispatch, router);
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch, router]);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated && !user) {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  // Fetch profile on mount
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchProfile(user.id));
    }
  }, [dispatch, user?.id]);

  // Fetch user posts count for profile completion
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user?.id) return;
      
      try {
        const response = await postsApi.getUserPosts(user.id);
        if (response.success && response.data?.posts) {
          setUserPostsCount(response.data.posts.length);
        }
      } catch (error) {
        console.error('Failed to fetch user posts:', error);
        // Set to 0 on error (user hasn't created posts or error occurred)
        setUserPostsCount(0);
      }
    };

    fetchUserPosts();
  }, [user?.id]);

  // Handler to refresh profile data
  const handleProfileRefresh = () => {
    if (user?.id) {
      dispatch(fetchProfile(user.id));
    }
  };

  const handleRetry = () => {
    if (user?.id) {
      dispatch(fetchProfile(user.id));
    }
  };

  const handleCompleteProfile = () => {
    dispatch(openHeroModal());
  };

  // Show loading while checking authentication
  if (!isAuthenticated && !user) {
    return (
      <>
        <UserTutorial run={true} />
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">Verifying authentication...</p>
          </div>
        </div>
      </>
    );
  }

  // Loading state
  if (loading) {
    return (
      <>
        <UserTutorial run={true} />
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state with retry
  if (error && error.type !== "NOT_FOUND") {
    // Handle UNAUTHORIZED errors by clearing tokens and redirecting
    if (error.type === "UNAUTHORIZED" || error.code === 401) {
      checkTokenExpiration(dispatch, router);
      return (
        <>
          <UserTutorial run={true} />
          <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">Session expired. Redirecting to login...</p>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <UserTutorial run={true} />
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
          >
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              {error.type === "NETWORK_ERROR" ? "Network Error" : "Error Loading Profile"}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">{error.message}</p>
            <Button
              onClick={handleRetry}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </motion.div>
          <HeroSectionModal />
          <AddSectionsModal onSectionAdded={handleProfileRefresh} />
        </div>
      </>
    );
  }

  // Profile not found (404) - Show create profile prompt
  if (!profile || error?.type === "NOT_FOUND") {
    return (
      <>
        <UserTutorial run={true} />
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
          >
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Welcome! Let&apos;s Create Your Profile
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              You don&apos;t have a profile yet. Let&apos;s set one up to get started.
            </p>
            <Button
              data-tour="create-profile-button"
              onClick={handleCompleteProfile}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          </motion.div>
          <HeroSectionModal />
          <AddSectionsModal onSectionAdded={handleProfileRefresh} />
        </div>
      </>
    );
  }

  // Partial profile view (not authenticated or viewing someone else's profile)
  if (isPartial) {
    return (
      <>
        <UserTutorial run={true} />
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
          <div className="max-w-6xl mx-auto px-4 pt-8 pb-60">
            {/* Limited Profile View */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl overflow-hidden mb-6"
          >
            {/* Cover Photo Placeholder */}
            <div className="h-48 bg-gradient-to-r from-purple-600 to-blue-600" />

            {/* Profile Info */}
            <div className="p-8">
              <div className="flex items-start gap-6 -mt-20 mb-6">
                <div className="w-32 h-32 rounded-full bg-neutral-200 dark:bg-neutral-800 border-4 border-white dark:border-neutral-900 flex items-center justify-center">
                  <User className="h-16 w-16 text-neutral-400" />
                </div>
                <div className="flex-1 mt-20">
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                    {profile.personal_information?.first_name}{" "}
                    {profile.personal_information?.last_name}
                  </h1>
                  {profile.about?.industry && (
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                      {profile.about.industry} • {profile.about.current_status}
                    </p>
                  )}
                  {profile.about?.professional_summary && (
                    <p className="text-neutral-700 dark:text-neutral-300 mt-4">
                      {profile.about.professional_summary}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mt-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This is a limited profile view. Log in to see more details or create your own
                  profile.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        <HeroSectionModal />
        <AddSectionsModal onSectionAdded={handleProfileRefresh} />
      </div>
      </>
    );
  }

  // Complete profile view (authenticated user viewing their own profile)
  // Prepare data for ProfileHeroPlugPlay
  const profileHeroData = {
    name: `${profile.personal_information?.first_name || ''} ${profile.personal_information?.last_name || ''}`.trim(),
    headline: profile.about?.industry && profile.about?.current_status 
      ? `${profile.about.industry} • ${profile.about.current_status}`
      : '',
    location: profile.personal_information?.city && profile.personal_information?.country
      ? `${profile.personal_information.city}, ${profile.personal_information.country}`
      : '',
    // Use avatar.fileUrl from upload API response, fallback to profile_picture
    avatarUrl: profile.avatar?.fileUrl || profile.personal_information?.profile_picture || '',
    // Use banner.fileUrl from upload API response, fallback to cover_photo
    coverUrl: profile.banner?.fileUrl || profile.personal_information?.cover_photo || 'https://images.unsplash.com/photo-1557683316-973673baf926',
  };

  // Prepare personal information for editing
  const personalInfoData: Partial<import('@/lib/api/profile').PersonalInformation> = {
    first_name: profile.personal_information?.first_name || '',
    last_name: profile.personal_information?.last_name || '',
    email: profile.personal_information?.email || '',
    phone_number: profile.personal_information?.phone_number || '',
    date_of_birth: profile.personal_information?.date_of_birth,
    gender: profile.personal_information?.gender,
    profession: profile.personal_information?.profession || profile.about?.industry || '',
    country: profile.personal_information?.country || '',
    state_province: profile.personal_information?.state_province || '',
    city: profile.personal_information?.city || '',
    postal_code: profile.personal_information?.postal_code,
  };

  // Prepare about data
  const aboutDataForHero: Partial<import('@/lib/api/profile').About> = {
    professional_summary: profile.about?.professional_summary || '',
    industry: profile.about?.industry,
    current_status: profile.about?.current_status,
    website_url: profile.about?.website_url,
    linkedin_url: profile.about?.linkedin_url,
    github_url: profile.about?.github_url,
  };

  const handleEditProfile = () => {
    dispatch(openHeroModal());
  };

  const handleAddSection = () => {
    dispatch(openAddSectionsModal());
  };

  const handleAboutSave = async (data: Record<string, unknown>) => {
    if (!user?.id) return;
    
    try {
      // Helper to remove undefined values
      const removeUndefinedValues = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
        return Object.entries(obj).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            (acc as Record<string, unknown>)[key] = value;
          }
          return acc;
        }, {} as Partial<T>);
      };

      const cleanAboutData = removeUndefinedValues(data as Partial<About>);
      
      await updateHeroSection(user.id, {
        about: cleanAboutData,
      });

      // Refresh profile data
      handleProfileRefresh();
    } catch (error) {
      console.error('Failed to update about section:', error);
      // Optional: Show error toast
    }
  };

  // Debug logs
  console.log('Profile Page - Full profile data:', profile);
  console.log('Profile Page - Resume data:', profile.resume);
  console.log('Profile Page - Resume URL:', profile.resume?.fileUrl);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-24">
        {/* Hero Section - Using ProfileHeroPlugPlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ProfileHeroPlugPlay
            profileData={profileHeroData}
            personalInfo={personalInfoData}
            aboutData={aboutDataForHero}
            currentStatus={profile.about?.current_status}
            isSelfProfile={true}
            onEdit={handleEditProfile}
            onAddSection={handleAddSection}
            onProfileRefresh={handleProfileRefresh}
            resumeUrl={profile.resume?.fileUrl || null}
          />
        </motion.div>

        {/* Profile Completion Bar - Always show if profile exists and is incomplete */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6"
            data-tour="profile-completion"
          >
            <ProfileCompletionBar
              profile={profile}
              userPostsCount={userPostsCount}
            />
          </motion.div>
        )}

        {/* Professional Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
            data-tour="about-section"
          >
            <AboutSection
              aboutData={(profile.about || {}) as Record<string, unknown>}
              isSelfProfile={true}
              onSave={handleAboutSave}
            />
          </motion.div>

        {/* Profile Sections - Data from API */}
        <div className="space-y-6">
          {/* Note: Section components would render here with actual API data */}
          {/* They can be integrated once the API data format matches component props */}
          
          {/* Education Section - Only show if data exists */}
          {profile.education && profile.education.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              data-tour="education-section"
            >
              <EducationSection
                educationData={profile.education?.map((edu, index) => ({
                  ...edu,
                  id: 'id' in edu && typeof edu.id === 'number' ? edu.id : Date.now() + index,
                })) || []}
                isSelfProfile={true}
                onSave={() => {}}
                onEducationRefresh={handleProfileRefresh}
              />
            </motion.div>
          )}

          {/* Skills Section - Only show if data exists */}
          {profile.skills && profile.skills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              data-tour="skills-section"
            >
              <SkillsSection
                skillsData={profile.skills?.map((skill, index) => ({
                  ...skill,
                  id: 'id' in skill && typeof skill.id === 'number' ? skill.id : Date.now() + index,
                })) || []}
                isSelfProfile={true}
                onSave={() => {}}
                onSkillsRefresh={handleProfileRefresh}
              />
            </motion.div>
          )}

          {/* Experience Section - Only show if data exists */}
          {profile.experience && profile.experience.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              data-tour="experience-section"
            >
              <ExperienceSection
                  experienceData={profile.experience?.map((exp, index) => ({
                    ...exp,
                    id: 'id' in exp && typeof exp.id === 'number' ? exp.id : Date.now() + index,
                  })) || []}
                  isSelfProfile={true}
                  onSave={() => {}}
                  onExperienceRefresh={handleProfileRefresh}
                />
            </motion.div>
          )}

          {/* Projects Section */}
          {profile.projects && profile.projects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ProjectsSection
                projectsData={profile.projects.map((proj, index) => ({
                  ...proj,
                  id: 'id' in proj && typeof proj.id === 'number' ? proj.id : Date.now() + index,
                }))}
                isSelfProfile={true}
                onSave={() => {}}
                onProjectsRefresh={handleProfileRefresh}
              />
            </motion.div>
          )}

          {/* Awards Section */}
          {profile.awards && profile.awards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <AwardsSection
                awardsData={profile.awards.map((award, index) => ({
                  ...award,
                  id: 'id' in award && typeof award.id === 'number' ? award.id : Date.now() + index,
                  description: award.description || '',
                  certificate_url: award.certificate_url || '',
                }))}
                isSelfProfile={true}
                onSave={handleProfileRefresh}
              />
            </motion.div>
          )}

          {/* Certifications Section */}
          {profile.certifications && profile.certifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <CertificationsSection
                certificationsData={profile.certifications.map((cert, index) => ({
                  ...cert,
                  id: 'id' in cert && typeof cert.id === 'number' ? cert.id : Date.now() + index,
                  never_expires: Boolean('never_expires' in cert ? cert.never_expires : !cert.expiration_date),
                  license_number: cert.license_number || '',
                  expiration_date: cert.expiration_date || '',
                  verification_url: cert.verification_url || '',
                  certificate_url: cert.certificate_url || undefined, // Include certificate_url from API
                }))}
                isSelfProfile={true}
                onSave={handleProfileRefresh}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <HeroSectionModal />
      <AddSectionsModal onSectionAdded={handleProfileRefresh} />
      
      {/* User Tutorial Component */}
      <UserTutorial run={true} />
    </div>
  );
}