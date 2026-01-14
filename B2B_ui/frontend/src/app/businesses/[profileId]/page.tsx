"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { 
  setSelectedProfile, 
  fetchAllBusinessSections,
  clearSectionData,
  fetchUserBusinessProfiles,
  type BusinessProfileState
} from "@/store/slices/businessProfileSlice";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessProfileApi } from "@/lib/api";
import type { BusinessProfile } from "@/types/auth";
import {
  BusinessHeroSection,
  BusinessAboutSection,
  BusinessContactSection,
  BusinessProjectsSection,
  BusinessAchievementsSection,
  BusinessDetailsSection,
  AddSectionsModal,
  BusinessAboutForm,
} from "@/components/business-profile";
import { BusinessJobsSection } from "@/components/business-profile/BusinessJobsSection";

export default function BusinessProfilePage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const profileId = params?.profileId as string;
  
  const { 
    selectedProfile, 
    showAddSectionsModal, 
    activeSectionForm,
    sections,
    sectionLoading,
    sectionErrors,
    fetching: fetchingProfiles
  } = useAppSelector((state: { businessProfile: BusinessProfileState }) => state.businessProfile);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialDataFetched, setInitialDataFetched] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // Fetch all business profile sections independently
  useEffect(() => {
    if (!profileId) {
      setError("Invalid business profile ID");
      setLoading(false);
      return;
    }

    // Clear any existing section data
    dispatch(clearSectionData());
    
    // First, fetch user business profiles to get the main profile data
    const fetchMainProfile = async () => {
      try {
        setLoading(true);
        
        // First, try to fetch user business profiles to check if user is a member
        const profilesResult = await dispatch(fetchUserBusinessProfiles({ includeInactive: true })).unwrap();
        
        // Find the specific profile by ID
        const currentProfile = profilesResult.find((profile: BusinessProfile) => profile.profileId === profileId);
        
        if (currentProfile) {
          // User is a member - use member data
          dispatch(setSelectedProfile(currentProfile));
          // Then fetch all sections for this profile
          await dispatch(fetchAllBusinessSections(profileId)).unwrap();
        } else {
          // User is not a member - fetch public profile
          const publicProfileResponse = await businessProfileApi.getPublicBusinessProfile(profileId);
          
          if (publicProfileResponse.success && publicProfileResponse.data?.companyPages && publicProfileResponse.data.companyPages.length > 0) {
            const publicProfile = publicProfileResponse.data.companyPages[0];
            dispatch(setSelectedProfile(publicProfile));
            // Fetch public sections
            await dispatch(fetchAllBusinessSections(profileId)).unwrap();
          } else {
            throw new Error("Business profile not found");
          }
        }
        
        setInitialDataFetched(true);
        setLoading(false);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to fetch business profile:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load business profile data";
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchMainProfile();
  }, [profileId, dispatch]);

  // Create a composite business profile object from sections data
  const businessProfile: BusinessProfile | null = selectedProfile ? {
    ...selectedProfile,
    companyProfileData: {
      ...selectedProfile.companyProfileData,
      // Merge fetched sections data with the base profile
      about: sections.about ,
      projects: sections.projects ,
      achievements: sections.achievements ,
      avatar: sections.avatar ,
      banner: sections.banner ,
      private_info: sections.privateInfo ,
    },
  } as BusinessProfile : null;

  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.push('/businesses');
    } else {
      // If no history, go to businesses page
      router.back();
    }
  };

  const handleRevokeMembership = async () => {
    if (!profileId || !businessProfile) return;
    
    setRevoking(true);
    try {
      const response = await businessProfileApi.revokeMembership(profileId);
      
      if (response.success) {
        // Redirect to businesses page without showing message
        router.push('/businesses');
      } else {
        throw new Error(response.message || 'Failed to revoke membership');
      }
    } catch (err) {
      console.error('Failed to revoke membership:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke membership';
      alert(`Error: ${errorMessage}`);
    } finally {
      setRevoking(false);
      setShowRevokeModal(false);
    }
  };

  // Loading state - show loading if initial fetch hasn't completed, fetching profiles, or any section is loading
  const isLoading = loading || fetchingProfiles || (!initialDataFetched && Object.values(sectionLoading).some(loading => loading));
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading business profile...</p>
        </div>
      </div>
    );
  }

  // Error state - show error if there's a general error or if profile ID is missing
  if (error || !profileId) {
    return (
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
            Business Profile Not Available
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {error || "Unable to load the business profile at this time."}
          </p>
          <Button
            onClick={handleGoBack}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header with Back Button */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Businesses
            </Button>
            
            {/* Show revoke button only if user is not the owner and is a member */}
            {businessProfile && businessProfile.role && businessProfile.role !== 'owner' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevokeModal(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Business
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero Section - Always shown */}
        <BusinessHeroSection 
          businessProfile={businessProfile} 
          isLoading={sectionLoading.avatar || sectionLoading.banner}
          error={sectionErrors.avatar || sectionErrors.banner}
        />

        {/* Jobs Section - Always shown for business profiles */}
        <BusinessJobsSection businessProfile={businessProfile} />
        
        {/* About Section - Only shown if data exists or loading */}
        <BusinessAboutSection 
          businessProfile={businessProfile}
          isLoading={sectionLoading.about}
          error={sectionErrors.about}
        />


        {/* Contact Information - Only shown if contact data exists */}
        <BusinessContactSection businessProfile={businessProfile} />

        {/* Projects Section - Only shown if projects exist or loading */}
        {(sections.projects && sections.projects.length > 0) || sectionLoading.projects ? (
          <BusinessProjectsSection 
            businessProfile={businessProfile}
            isLoading={sectionLoading.projects}
            error={sectionErrors.projects}
          />
        ) : null}

        {/* Achievements Section - Only shown if achievements exist or loading */}
        <BusinessAchievementsSection 
          businessProfile={businessProfile}
          isLoading={sectionLoading.achievements}
          error={sectionErrors.achievements}
        />

        {/* Company Details - Always shown */}
        <BusinessDetailsSection businessProfile={businessProfile} />
      </div>

      {/* Modals */}
      <AddSectionsModal isOpen={showAddSectionsModal} />
      <BusinessAboutForm 
        isOpen={activeSectionForm === 'about'} 
        profileId={profileId}
      />
      
      {/* Revoke Membership Confirmation Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Leave Business
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowRevokeModal(false)}
                disabled={revoking}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mb-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-center text-neutral-600 dark:text-neutral-400 mb-2">
                Are you sure you want to leave{' '}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {businessProfile?.businessName || businessProfile?.companyProfileData?.companyName || 'this business'}
                </span>?
              </p>
              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                You will lose access to this business profile and will need to be re-invited to rejoin.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRevokeModal(false)}
                disabled={revoking}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRevokeMembership}
                disabled={revoking}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {revoking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  'Leave Business'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}