"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUserBusinessProfiles } from "@/store/slices/businessProfileSlice";
import { motion } from "framer-motion";
import {
  Plus,
  Loader2,
  ArrowLeft,
  Building2,
  Globe,
  Lock,
  MapPin,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// BusinessBanner Component with Smart Fallback
const BusinessBanner = ({ banner, businessName }: { banner?: string; businessName: string }) => {
  const [bannerSrc, setBannerSrc] = useState<string | null>(null);
  const [showGradient, setShowGradient] = useState(false);

  useEffect(() => {
    // Check if banner is provided and not a broken/placeholder URL
    if (banner && !banner.includes('cdn.example.com') && banner.trim() !== '') {
      setBannerSrc(banner);
      setShowGradient(false);
    } else {
      // Use gradient fallback
      setBannerSrc(null);
      setShowGradient(true);
    }
  }, [banner, businessName]);

  const handleImageError = () => {
    // If the banner fails to load, show the gradient fallback
    setBannerSrc(null);
    setShowGradient(true);
  };

  if (showGradient || !bannerSrc) {
    return (
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 h-20"></div>
    );
  }

  return (
    <div className="h-20 overflow-hidden">
      <img
        src={bannerSrc}
        alt={`${businessName} Banner`}
        className="w-full h-full object-cover"
        onError={handleImageError}
      />
    </div>
  );
};

// BusinessLogo Component with Smart Fallback
const BusinessLogo = ({ logo, businessName }: { logo?: string; businessName: string }) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    // Check if logo is provided and not a broken/placeholder URL
    if (logo && !logo.includes('cdn.example.com') && logo.trim() !== '') {
      setLogoSrc(logo);
      setShowIcon(false);
    } else {
      // Try to generate a fallback using UI Avatars
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&size=64&background=6366f1&color=ffffff&bold=true`;
      setLogoSrc(fallbackUrl);
      setShowIcon(false);
    }
  }, [logo, businessName]);

  const handleImageError = () => {
    // If the image fails to load, show the icon fallback
    setLogoSrc(null);
    setShowIcon(true);
  };

  if (showIcon || !logoSrc) {
    return (
      <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-2xl flex items-center justify-center border-4 border-white dark:border-neutral-900 shadow-lg">
        <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={`${businessName} Logo`}
      className="w-16 h-16 rounded-2xl object-cover border-4 border-white dark:border-neutral-900 shadow-lg"
      onError={handleImageError}
    />
  );
};

export default function BusinessesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { profiles: businessProfiles, fetching: fetchingBusinessProfiles } = useAppSelector(
    (state) => state.businessProfile
  );
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated && !user) {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  // Fetch business profiles on mount
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserBusinessProfiles({ includeInactive: true }));
    }
  }, [dispatch, user?.id]);

  const handleCreateBusinessProfile = () => {
    router.push("/profile/create-business");
  };

  const handleGoBack = () => {
    router.push("/profile");
  };

  const handleViewBusinessProfile = (profileId: string) => {
    if (profileId) {
      router.push(`/businesses/${profileId}`);
    }
  };

  // Filters for company listing
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredProfiles = businessProfiles.filter((p) => {
    if (roleFilter !== "all" && p.role !== roleFilter) return false;
    if (activeFilter === "active" && !p.isActive) return false;
    if (activeFilter === "inactive" && p.isActive) return false;
    return true;
  });

  // Show loading while checking authentication
  if (!isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={handleGoBack}
              variant="outline"
              size="sm"
              className="border-neutral-300 dark:border-neutral-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </div> */}
          
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                    Business Profiles
                  </h1>
                  <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-1">
                    Manage your company pages and business presence on the platform
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCreateBusinessProfile}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Create Business Profile</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Business Profiles Content */}
        {businessProfiles.length > 0 && (
          <div className="mb-6">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Role:</label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">All Roles</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status:</label>
                    <select
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
                      className="text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Showing <span className="font-medium text-purple-600 dark:text-purple-400">{filteredProfiles.length}</span> of <span className="font-medium">{businessProfiles.length}</span> profiles
                </div>
              </div>
            </div>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {fetchingBusinessProfiles ? (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mr-3" />
                <span className="text-lg text-neutral-600 dark:text-neutral-400">Loading business profiles...</span>
              </div>
            </div>
          ) : filteredProfiles.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProfiles.map((businessProfile, index) => (
                <motion.div
                  key={businessProfile.profileId || `profile_${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  onClick={() => handleViewBusinessProfile(businessProfile.profileId || '')}
                >
                  {/* Business Profile Header with Banner */}
                  <BusinessBanner 
                    banner={businessProfile.banner || businessProfile.companyProfileData?.banner?.fileUrl}
                    businessName={businessProfile.businessName || businessProfile.companyProfileData?.companyName || 'Company'}
                  />
                  
                  <div className="p-6">
                    {/* Logo and Basic Info */}
                    <div className="flex items-start gap-4 -mt-12 mb-4">
                      <BusinessLogo 
                        logo={businessProfile.logo || businessProfile.companyProfileData?.company_logo?.fileUrl}
                        businessName={businessProfile.businessName || businessProfile.companyProfileData?.companyName || 'Company'}
                      />
                      {/* <div className="flex-1 mt-9">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-3 h-3 rounded-full ${
                            businessProfile.isActive ? "bg-green-500" : "bg-red-500"
                          }`}></span>
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            {businessProfile.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div> */}
                    </div>

                    {/* Company Name and Industry */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                        {businessProfile.businessName || businessProfile.companyProfileData?.companyName || "Business Profile"}
                      </h3>
                      
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                        Joined: {new Date(businessProfile.joinedAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Company Details */}
                    <div className="space-y-2 mb-4">                      
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <MapPin className="h-4 w-4" />
                        <span>Industry:  {businessProfile.industry} </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">Last active: {new Date(businessProfile.lastActive).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Status and Role */}
                    <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2">
                        {businessProfile.isActive ? (
                          <Globe className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-neutral-500" />
                        )}
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {businessProfile.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        businessProfile.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                        businessProfile.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {businessProfile.role}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      {/* <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-neutral-300 dark:border-neutral-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add edit functionality here
                        }}
                      >
                        Edit Profile
                      </Button> */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewBusinessProfile(businessProfile.profileId || '');
                        }}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : businessProfiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-12"
            >
              <div className="text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building2 className="h-12 w-12 text-neutral-400" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                  No Business Profiles Yet
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                  Create your first business profile to establish your company presence on the platform. 
                  Showcase your business, connect with other companies, and expand your professional network.
                </p>
                <Button
                  onClick={handleCreateBusinessProfile}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-5 w-5" />
                  Create Your First Business Profile
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-12"
            >
              <div className="text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building2 className="h-12 w-12 text-neutral-400" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                  No Profiles Match Your Filters
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                  Try adjusting your role or status filters to see more business profiles.
                </p>
                <Button
                  onClick={() => {
                    setRoleFilter("all");
                    setActiveFilter("all");
                  }}
                  variant="outline"
                  className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20 flex items-center gap-2 mx-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}