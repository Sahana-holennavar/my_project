"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { getProfile, type ProfileData, type ProfileResponse } from "@/lib/api/profile";
import { sendConnectionRequest, checkConnectionStatus, removeConnection, withdrawConnectionRequest, getSentRequests } from "@/lib/api/connections";
import ProfileHeroPlugPlay from "@/components/profile/ProfileHeroPlugPlay";
import AboutSection from "@/components/profile/AboutSection";
import EducationSection from "@/components/profile/EducationSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import SkillsSection from "@/components/profile/SkillsSection";
import ProjectsSection from "@/components/profile/ProjectsSection";
import AwardsSection from "@/components/profile/AwardsSection";
import CertificationsSection from "@/components/profile/CertificationsSection";
import { Toast, useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const { toast, showToast, hideToast } = useToast();

  // Check if current user is viewing their own profile
  const isSelfProfile = currentUser?.id === userId;

  // Redirect to /profile if viewing own profile
  useEffect(() => {
    if (isSelfProfile && currentUser?.id) {
      console.log('🔀 Redirecting to own profile page');
      router.push('/profile');
    }
  }, [isSelfProfile, currentUser?.id, router]);

  // Fetch connection status and check for sent requests
  useEffect(() => {
    const fetchConnectionStatus = async () => {
      if (!userId || isSelfProfile) return;

      try {
        console.log('🔍 Checking connection status with:', userId);
        const response = await checkConnectionStatus(userId);

        if (response.success && response.data) {
          const isConnected = response.data.is_connected;
          console.log('✅ Connection status - is_connected:', isConnected);
          
          // Map is_connected to status
          if (isConnected) {
            setConnectionStatus('connected');
            setIsConnected(true);
          } else {
            // Check if there's a pending sent request to this user
            console.log('🔍 Checking for sent request to:', userId);
            const sentResponse = await getSentRequests({ recipient: userId });
            
            // Filter only pending requests
            const pendingRequests = sentResponse.data?.filter(req => 
              req.payload?.connect_request === 'pending'
            ) || [];
            
            if (sentResponse.success && pendingRequests.length > 0) {
              console.log('✅ Found pending sent request');
              setConnectionStatus('pending');
            } else {
              console.log('❌ No pending sent request found');
              setConnectionStatus('none');
            }
            setIsConnected(false);
          }
        }
      } catch (error) {
        console.error('❌ Error checking connection status:', error);
      }
    };

    fetchConnectionStatus();
  }, [userId, isSelfProfile]);

  // Socket event listeners for real-time connection updates
  useEffect(() => {
    const handleConnectionAccepted = () => {
      console.log('🔔 Real-time: Connection accepted, updating status');
      // Update connection status immediately
      setConnectionStatus('connected');
      setIsConnected(true);
      showToast('Connection accepted!', 'success');
    };

    const handleConnectionRejected = () => {
      console.log('🔔 Real-time: Connection rejected, updating status');
      // Update connection status immediately
      setConnectionStatus('none');
      setIsConnected(false);
      showToast('Connection request was rejected', 'info');
    };

    // Listen for socket events
    window.addEventListener('connection:accepted', handleConnectionAccepted);
    window.addEventListener('connection:rejected', handleConnectionRejected);

    return () => {
      window.removeEventListener('connection:accepted', handleConnectionAccepted);
      window.removeEventListener('connection:rejected', handleConnectionRejected);
    };
  }, [showToast]);

  // Privacy check function - Always show all sections (privacy settings ignored)
  const canViewSection = (visibility: string | boolean | undefined): boolean => {
    // Always return true to show all profile sections regardless of privacy settings
    return true;
  };

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setError("Invalid user ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("🔍 Fetching profile for userId:", userId);
        console.log("👤 Current user ID:", currentUser?.id);
        console.log("🔐 Is self profile:", isSelfProfile);
        
        const response: ProfileResponse = await getProfile(userId);
        
        console.log("📦 API Response:", {
          success: response.success,
          message: response.message,
          hasData: !!response.data,
          isComplete: response.isComplete,
          isPartial: response.isPartial,
        });
        
        if (response.data) {
          console.log("✅ Profile data received:", {
            user_id: response.data.user_id,
            hasPersonalInfo: !!response.data.personal_information,
            hasAbout: !!response.data.about,
            educationCount: response.data.education?.length || 0,
            experienceCount: response.data.experience?.length || 0,
          });
        }
        
        if (response.success && response.data) {
          setProfile(response.data);
        } else {
          console.error("❌ Failed to load profile:", response.message);
          setError(response.message || "Profile not found");
        }
      } catch (err) {
        console.error("💥 Error fetching profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, currentUser?.id, isSelfProfile]);

  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // If no history (e.g., direct link), go to feed or home
      router.push('/feed');
    }
  };

  // No-op handlers for read-only mode
  const handleNoOpSave = () => {
    console.log("Save disabled in view-only mode");
  };

  const handleConnect = () => {
    // Deprecated - use handleFollow instead
    console.log("Send connection request to:", userId);
  };

  const handleMessage = () => {
    // TODO: Implement messaging
    console.log("Send message to:", userId);
  };

  const handleFollow = async () => {
    if (connectionLoading || !userId) return;

    try {
      setConnectionLoading(true);
      
      const response = await sendConnectionRequest(userId);

      if (response.success) {
        setConnectionStatus('pending');
        showToast(response.message || 'Connection request sent successfully!', 'success');
      } else {
        const errorMessage = response.errors?.[0]?.message || response.message || 'Failed to send connection request';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Connection request failed:', error);
      showToast('Failed to send connection request', 'error');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!userId) return;

    const confirmDisconnect = window.confirm(
      `Are you sure you want to remove ${profile?.personal_information?.first_name || 'this user'} from your connections?`
    );

    if (!confirmDisconnect) return;

    try {
      setConnectionLoading(true);
      console.log('🔌 Removing connection with:', userId);
      
      const response = await removeConnection(userId);

      if (response.success) {
        console.log('✅ Connection removed successfully');
        setConnectionStatus('none');
        setIsConnected(false);
        showToast('Connection removed successfully', 'success');
      } else {
        const errorMessage = response.errors?.[0]?.message || response.message || 'Failed to remove connection';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ Error removing connection:', error);
      showToast('Failed to send connection request. Please try again.', 'error');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userId) return;

    const confirmWithdraw = window.confirm(
      `Are you sure you want to withdraw your connection request to ${profile?.personal_information?.first_name || 'this user'}?`
    );

    if (!confirmWithdraw) return;

    try {
      setConnectionLoading(true);
      console.log('🔙 Withdrawing connection request to:', userId);
      
      const response = await withdrawConnectionRequest(userId);

      if (response.success) {
        console.log('✅ Connection request withdrawn successfully');
        setConnectionStatus('none');
        showToast('Connection request withdrawn successfully', 'success');
      } else {
        const errorMessage = response.errors?.[0]?.message || response.message || 'Failed to withdraw connection request';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ Error withdrawing connection request:', error);
      showToast('Failed to withdraw connection request. Please try again.', 'error');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleShare = async () => {
    const profileUrl = window.location.href;
    const profileName = `${profile?.personal_information?.first_name || ''} ${profile?.personal_information?.last_name || ''}`.trim();
    
    // Use native share API if available (mobile/modern browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profileName}'s Profile`,
          text: `Check out ${profileName}'s profile on our platform`,
          url: profileUrl,
        });
        console.log('Profile shared successfully');
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to copy
          await navigator.clipboard.writeText(profileUrl);
          showToast('Profile link copied to clipboard!', 'success');
        }
      }
    } else {
      // Fallback: copy to clipboard for desktop
      try {
        await navigator.clipboard.writeText(profileUrl);
        showToast('Profile link copied to clipboard!', 'success');
      } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy link', 'error');
      }
    }
  };

  // Helper function to add id to array items (components require id field)
  const addIdsToArray = <T,>(arr: T[]): (T & { id: number })[] => {
    return arr.map((item, index) => ({ ...item, id: index + 1 }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
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
            Profile Not Found
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {error || "The user profile you're looking for doesn't exist."}
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

  const personalInfo = profile.personal_information;
  const about = profile.about;

  // Prepare data for ProfileHeroPlugPlay (same format as main profile page)
  const profileHeroData = {
    name: `${personalInfo?.first_name || ''} ${personalInfo?.last_name || ''}`.trim(),
    headline: about?.industry && about?.current_status 
      ? `${about.industry} • ${about.current_status}`
      : about?.industry || '',
    location: personalInfo?.city && personalInfo?.country
      ? `${personalInfo.city}, ${personalInfo.country}`
      : '',
    avatarUrl: profile.avatar?.fileUrl || personalInfo?.profile_picture || '',
    coverUrl: profile.banner?.fileUrl || personalInfo?.cover_photo || 'https://images.unsplash.com/photo-1557683316-973673baf926',
  };

  const personalInfoData: Partial<import('@/lib/api/profile').PersonalInformation> = {
    first_name: personalInfo?.first_name || '',
    last_name: personalInfo?.last_name || '',
    email: personalInfo?.email || '',
    phone_number: personalInfo?.phone_number || '',
    date_of_birth: personalInfo?.date_of_birth,
    gender: personalInfo?.gender,
    country: personalInfo?.country || '',
    state_province: personalInfo?.state_province || '',
    city: personalInfo?.city || '',
    postal_code: personalInfo?.postal_code || '',
    profile_picture: personalInfo?.profile_picture || '',
    cover_photo: personalInfo?.cover_photo || '',
  };

  const aboutDataForHero: Partial<import('@/lib/api/profile').About> = {
    professional_summary: about?.professional_summary || '',
    industry: about?.industry,
    current_status: about?.current_status,
    website_url: about?.website_url || '',
    linkedin_url: about?.linkedin_url || '',
    github_url: about?.github_url || '',
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header with Back Button */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-20">
        {/* Hero Section - Using ProfileHeroPlugPlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <ProfileHeroPlugPlay
            profileData={profileHeroData}
            personalInfo={personalInfoData}
            aboutData={aboutDataForHero}
            currentStatus={profile.about?.current_status}
            isSelfProfile={false}
            onShare={handleShare}
            onFollow={handleFollow}
            resumeUrl={profile.resume?.fileUrl || null}
            userId={userId}
            connectionStatus={connectionStatus}
            onDisconnect={handleDisconnect}
            onWithdraw={handleWithdraw}
          />
        </motion.div>

        {/* About Section - Show all data regardless of privacy settings */}
        {about && (
          <div className="mb-6">
            <AboutSection 
              aboutData={about as unknown as Record<string, unknown>} 
              isSelfProfile={false}
              onSave={handleNoOpSave}
            />
          </div>
        )}

        {/* Education Section - Show all data regardless of privacy settings */}
        {profile.education && profile.education.length > 0 && (
          <div className="mb-6">
            <EducationSection 
              educationData={addIdsToArray(profile.education)}
              isSelfProfile={false}
              onSave={handleNoOpSave}
            />
          </div>
        )}

        {/* Experience Section - Show all data regardless of privacy settings */}
        {profile.experience && profile.experience.length > 0 && (
          <div className="mb-6">
            <ExperienceSection 
              experienceData={addIdsToArray(profile.experience)}
              isSelfProfile={false}
              onSave={handleNoOpSave}
            />
          </div>
        )}

        {/* Skills Section - Show all data regardless of privacy settings */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="mb-6">
            <SkillsSection 
              skillsData={addIdsToArray(profile.skills)}
              isSelfProfile={false}
              onSave={handleNoOpSave}
            />
          </div>
        )}

        {/* Projects Section - No privacy setting, default to public */}
        {profile.projects && profile.projects.length > 0 && (
          <div className="mb-6">
            <ProjectsSection 
              projectsData={addIdsToArray(profile.projects)}
              isSelfProfile={false}
              onSave={handleNoOpSave}
            />
          </div>
        )}

        {/* Awards Section - No privacy setting, default to public */}
        {profile.awards && profile.awards.length > 0 && (
          <div className="mb-6">
            <AwardsSection 
              awardsData={addIdsToArray(profile.awards.map(award => ({
                ...award,
                description: award.description || ''
              })))}
              isSelfProfile={false}
              onSave={handleNoOpSave}
            />
          </div>
        )}

        {/* Certifications Section - No privacy setting, default to public */}
        {profile.certifications && profile.certifications.length > 0 && (
          <div className="mb-6">
            <CertificationsSection 
              certificationsData={addIdsToArray(profile.certifications.map(cert => ({
                ...cert,
                never_expires: !cert.expiration_date,
                certificate_url: cert.certificate_url || undefined, // Include certificate_url from API
              })))}
              isSelfProfile={false}
              onSave={handleNoOpSave}
            />
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        position="top"
      />
    </div>
  );
}
