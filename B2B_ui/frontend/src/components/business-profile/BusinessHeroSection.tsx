"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, MapPin, Users, Plus, Loader2, AlertCircle, Camera, Upload, Edit, Trash2, X, Shield, Settings, ChevronDown, PenTool } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openAddSectionsModal, uploadBusinessAvatarAction, updateBusinessAvatarAction, deleteBusinessAvatarAction, uploadBusinessBannerAction, updateBusinessBannerAction, deleteBusinessBannerAction, fetchAllBusinessSections, fetchUserBusinessProfiles, setSelectedProfile } from "@/store/slices/businessProfileSlice";
import { businessProfileApi } from "@/lib/api";
import type { BusinessProfile } from "@/types/auth";
import { BusinessLogo } from "./BusinessLogo";
import { BusinessPrivateInfoForm } from "./BusinessPrivateInfoForm";

interface BusinessHeroSectionProps {
  businessProfile: BusinessProfile | null;
  delay?: number;
  isLoading?: boolean;
  error?: string | null;
}

export const BusinessHeroSection = ({ businessProfile, delay = 0, isLoading, error }: BusinessHeroSectionProps) => {
  const router = useRouter();
  const companyData = businessProfile?.companyProfileData;
  const dispatch = useAppDispatch();
  const { avatar, banner } = useAppSelector((state) => state.businessProfile);
  
  // Use new response structure fields with fallbacks to nested data
  const companyName = businessProfile?.businessName || businessProfile?.profileName || companyData?.companyName || 'Company Name';
  const companyLogo = businessProfile?.logo || companyData?.avatar?.fileUrl || companyData?.company_logo?.fileUrl;
  const companyBanner = businessProfile?.banner || companyData?.banner?.fileUrl;
  const companyIndustry = businessProfile?.industry || companyData?.industry;
  const companySize = businessProfile?.company_size || companyData?.company_size;
  const companyTagline = companyData?.tagline;
  const companyDescription = businessProfile?.description;
  const headquartersLocation = companyData?.about?.headquarters;
  
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAvatarDeleteConfirm, setShowAvatarDeleteConfirm] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showBannerDeleteConfirm, setShowBannerDeleteConfirm] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  
  const [showPrivateInfoModal, setShowPrivateInfoModal] = useState(false);
  
  // Self-demotion state
  const [showDemoteSelfConfirm, setShowDemoteSelfConfirm] = useState(false);
  const [demotingSelf, setDemotingSelf] = useState(false);
  
  const hasExistingAvatar = !!companyLogo;
  const hasExistingBanner = !!companyBanner;

  const handleAddSection = () => {
    dispatch(openAddSectionsModal());
  };

  const handleOpenPrivateInfo = () => {
    setShowPrivateInfoModal(true);
  };

  const handleOpenSettings = () => {
    if (businessProfile?.profileId) {
      router.push(`/businesses/${businessProfile.profileId}/dashboard`);
    }
  };
  
  const handleOpenPosts = () => {
    if (businessProfile?.profileId) {
      router.push(`/businesses/${businessProfile.profileId}/posts`);
    }
  };
  
  const handleDemoteSelf = async () => {
    if (!businessProfile?.profileId) return;
    
    setDemotingSelf(true);
    try {
      const response = await businessProfileApi.demoteSelf(businessProfile.profileId);
      
      if (response.success && response.data) {
        // Update the business profile in Redux store
        const updatedProfile: BusinessProfile = {
          ...businessProfile,
          role: 'editor' as const
        };
        
        dispatch(setSelectedProfile(updatedProfile));
        
        // Refresh the user's business profiles to sync with backend
        await dispatch(fetchUserBusinessProfiles({ includeInactive: true }));
        
        setShowDemoteSelfConfirm(false);
      } else {
        throw new Error(response.message || 'Failed to demote yourself');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to demote yourself';
      console.error('Failed to demote self:', error);
      alert(`Error: ${errorMessage}`);
    } finally {
      setDemotingSelf(false);
    }
  };
  
  const handleAvatarClick = () => {
    setShowAvatarModal(true);
  };
  
  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setSelectedAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file));
    }
  };
  
  const handleBannerClick = () => {
    setShowBannerModal(true);
  };
  
  const handleBannerFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (10MB limit for banners)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      setSelectedBannerFile(file);
      setBannerPreviewUrl(URL.createObjectURL(file));
    }
  };
  
  const handleUploadAvatar = async () => {
    if (selectedAvatarFile && businessProfile?.profileId) {
      try {
        if (hasExistingAvatar) {
          await dispatch(updateBusinessAvatarAction({
            profileId: businessProfile.profileId,
            avatarFile: selectedAvatarFile
          })).unwrap();
        } else {
          await dispatch(uploadBusinessAvatarAction({
            profileId: businessProfile.profileId,
            avatarFile: selectedAvatarFile
          })).unwrap();
        }
        setShowAvatarModal(false);
        setSelectedAvatarFile(null);
        setAvatarPreviewUrl(null);
      } catch (error) {
        console.error('Failed to upload avatar:', error);
      }
    }
  };
  
  const handleDeleteAvatar = async () => {
    if (businessProfile?.profileId) {
      try {
        await dispatch(deleteBusinessAvatarAction(businessProfile.profileId)).unwrap();
        // Force a refetch of the business profile to update the UI
        if (businessProfile.profileId) {
          await dispatch(fetchAllBusinessSections(businessProfile.profileId));
        }
        setShowAvatarDeleteConfirm(false);
        setShowAvatarModal(false);
      } catch (error) {
        console.error('Failed to delete avatar:', error);
      }
    }
  };
  
  const handleUploadBanner = async () => {
    if (selectedBannerFile && businessProfile?.profileId) {
      try {
        if (hasExistingBanner) {
          await dispatch(updateBusinessBannerAction({
            profileId: businessProfile.profileId,
            bannerFile: selectedBannerFile
          })).unwrap();
        } else {
          await dispatch(uploadBusinessBannerAction({
            profileId: businessProfile.profileId,
            bannerFile: selectedBannerFile
          })).unwrap();
        }
        setShowBannerModal(false);
        setSelectedBannerFile(null);
        setBannerPreviewUrl(null);
      } catch (error) {
        console.error('Failed to upload banner:', error);
      }
    }
  };
  
  const handleDeleteBanner = async () => {
    if (businessProfile?.profileId) {
      try {
        await dispatch(deleteBusinessBannerAction(businessProfile.profileId)).unwrap();
        // Force a refetch of the business profile to update the UI
        if (businessProfile.profileId) {
          await dispatch(fetchAllBusinessSections(businessProfile.profileId));
        }
        setShowBannerDeleteConfirm(false);
        setShowBannerModal(false);
      } catch (error) {
        console.error('Failed to delete banner:', error);
      }
    }
  };
  
  const resetAvatarModal = () => {
    setShowAvatarModal(false);
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl(null);
    setShowAvatarDeleteConfirm(false);
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };
  
  const resetBannerModal = () => {
    setShowBannerModal(false);
    setSelectedBannerFile(null);
    setBannerPreviewUrl(null);
    setShowBannerDeleteConfirm(false);
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = '';
    }
  };

  // Show the component even if businessProfile is null, with default values
  const profileData = businessProfile || {
    profileId: '',
    role: 'owner' as const,
    isActive: true,
  };

  if (!businessProfile) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl overflow-hidden mb-8"
      >
        {/* Cover/Banner */}
        <div className="h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-r from-purple-600 to-blue-600 relative group cursor-pointer"
             onClick={handleBannerClick}>
          {isLoading ? (
            <div className="w-full h-full bg-neutral-200 dark:bg-neutral-700 animate-pulse flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : error ? (
            <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <div className="text-center text-neutral-500 dark:text-neutral-400">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Failed to load banner</p>
              </div>
            </div>
          ) : companyBanner ? (
            <img
              src={companyBanner}
              alt="Company Banner"
              className="w-full h-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
              <Camera className="h-5 w-5" />
              <span className="text-sm font-medium">
                {hasExistingBanner ? 'Change Banner' : 'Add Banner'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-6 sm:px-8 pt-6 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6 -mt-16 sm:-mt-14 mb-6">
            <div className="relative z-10 flex-shrink-0 group">
              <div className="relative">
                <BusinessLogo
                  logo={companyLogo}
                  businessName={companyName}
                />
                <button
                  onClick={handleAvatarClick}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center"
                >
                  <Camera className="h-8 w-8 text-white" />
                </button>
              </div>
            </div>
            <div className="flex-1 sm:mt-12 min-w-0">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white mb-2 break-words">
                    {companyName}
                  </h1>
                  {(companyTagline || companyDescription) && (
                    <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 mb-3 break-words">
                      {companyTagline || companyDescription}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    {companyIndustry && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {companyIndustry}
                      </span>
                    )}
                    {headquartersLocation && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {headquartersLocation}
                      </span>
                    )}
                    {companySize && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {companySize} employees
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:flex-col lg:items-end">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {(businessProfile?.role === 'owner' || businessProfile?.role === 'admin') && (
                      <button
                        onClick={handleAddSection}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl transition-colors text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Add Section
                      </button>
                    )}
                    {(businessProfile?.role === 'owner' || businessProfile?.role === 'admin' || businessProfile?.role === 'editor') && (
                      <button
                        onClick={handleOpenPosts}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl transition-colors text-sm font-medium"
                        title="Manage business posts and content"
                      >
                        <PenTool className="h-4 w-4" />
                        Posts
                      </button>
                    )}
                    {(businessProfile?.role === 'owner' || businessProfile?.role === 'admin') && (
                      <button
                        onClick={handleOpenSettings}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl transition-colors text-sm font-medium"
                        title="Business settings and management"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                    )}
                    {businessProfile?.role === 'admin' && (
                      <button
                        onClick={() => setShowDemoteSelfConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors text-sm font-medium"
                        title="Demote yourself from Admin to Editor"
                      >
                        <ChevronDown className="h-4 w-4" />
                        Demote to Editor
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      profileData.isActive ? "bg-green-500" : "bg-red-500"
                    }`}></span>
                    <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                      {profileData.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${
                    profileData.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                    profileData.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {profileData.role|| ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Avatar Management Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !avatar.uploading && !avatar.updating && !avatar.deleting && resetAvatarModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md mx-auto"
            >
              {!showAvatarDeleteConfirm ? (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <Camera className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                          {hasExistingAvatar ? 'Manage Avatar' : 'Upload Avatar'}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {hasExistingAvatar ? 'Update or remove your company avatar' : 'Add a company avatar'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetAvatarModal}
                      disabled={avatar.uploading || avatar.updating || avatar.deleting}
                      className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Modal Body */}
                  <div className="p-6">
                    {/* Current Avatar Preview */}
                    {hasExistingAvatar && (
                      <div className="mb-6">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Current Avatar</p>
                        <div className="flex items-center gap-4">
                          <img
                            src={companyLogo}
                            alt="Current avatar"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <button
                            onClick={() => setShowAvatarDeleteConfirm(true)}
                            disabled={avatar.deleting}
                            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* File Upload */}
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                        {hasExistingAvatar ? 'Upload New Avatar' : 'Choose Avatar'}
                      </p>
                      
                      <input
                        ref={avatarFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileSelect}
                        className="hidden"
                      />
                      
                      {!selectedAvatarFile ? (
                        <button
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="w-full p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl hover:border-purple-400 dark:hover:border-purple-500 transition-colors flex flex-col items-center gap-3 text-neutral-600 dark:text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          <Upload className="h-8 w-8" />
                          <div className="text-center">
                            <p className="font-medium">Click to upload</p>
                            <p className="text-sm">PNG, JPG, GIF up to 5MB</p>
                          </div>
                        </button>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                            <img
                              src={avatarPreviewUrl!}
                              alt="Preview"
                              className="w-16 h-16 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-neutral-900 dark:text-white">{selectedAvatarFile.name}</p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {(selectedAvatarFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedAvatarFile(null);
                                setAvatarPreviewUrl(null);
                                if (avatarFileInputRef.current) {
                                  avatarFileInputRef.current.value = '';
                                }
                              }}
                              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => avatarFileInputRef.current?.click()}
                            className="w-full px-4 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Choose Different File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
                    <button
                      onClick={resetAvatarModal}
                      disabled={avatar.uploading || avatar.updating}
                      className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 font-medium"
                    >
                      Cancel
                    </button>
                    {selectedAvatarFile && (
                      <button
                        onClick={handleUploadAvatar}
                        disabled={avatar.uploading || avatar.updating}
                        className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[120px] justify-center"
                      >
                        {avatar.uploading || avatar.updating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {hasExistingAvatar ? 'Updating...' : 'Uploading...'}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {hasExistingAvatar ? 'Update Avatar' : 'Upload Avatar'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Delete Confirmation */
                <>
                  <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                        <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                          Remove Avatar
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          This action cannot be undone
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      Are you sure you want to remove your company avatar? This will permanently delete the current avatar image.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
                    <button
                      onClick={() => setShowAvatarDeleteConfirm(false)}
                      disabled={avatar.deleting}
                      className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAvatar}
                      disabled={avatar.deleting}
                      className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[120px] justify-center"
                    >
                      {avatar.deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Remove Avatar
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Banner Management Modal */}
      <AnimatePresence>
        {showBannerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !banner.uploading && !banner.updating && !banner.deleting && resetBannerModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl mx-auto"
            >
              {!showBannerDeleteConfirm ? (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <Camera className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                          {hasExistingBanner ? 'Manage Banner' : 'Upload Banner'}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {hasExistingBanner ? 'Update or remove your company banner' : 'Add a company banner'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetBannerModal}
                      disabled={banner.uploading || banner.updating || banner.deleting}
                      className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Modal Body */}
                  <div className="p-6">
                    {/* Current Banner Preview */}
                    {hasExistingBanner && (
                      <div className="mb-6">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Current Banner</p>
                        <div className="space-y-4">
                          <div className="aspect-[3/1] rounded-xl overflow-hidden">
                            <img
                              src={companyBanner}
                              alt="Current banner"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={() => setShowBannerDeleteConfirm(true)}
                            disabled={banner.deleting}
                            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Banner
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* File Upload */}
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                        {hasExistingBanner ? 'Upload New Banner' : 'Choose Banner'}
                      </p>
                      
                      <input
                        ref={bannerFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFileSelect}
                        className="hidden"
                      />
                      
                      {!selectedBannerFile ? (
                        <button
                          onClick={() => bannerFileInputRef.current?.click()}
                          className="w-full p-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl hover:border-purple-400 dark:hover:border-purple-500 transition-colors flex flex-col items-center gap-3 text-neutral-600 dark:text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          <Upload className="h-8 w-8" />
                          <div className="text-center">
                            <p className="font-medium">Click to upload banner</p>
                            <p className="text-sm">Recommended: 1200x400px, PNG, JPG up to 10MB</p>
                          </div>
                        </button>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="aspect-[3/1] rounded-xl overflow-hidden">
                              <img
                                src={bannerPreviewUrl!}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-white">{selectedBannerFile.name}</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {(selectedBannerFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedBannerFile(null);
                                  setBannerPreviewUrl(null);
                                  if (bannerFileInputRef.current) {
                                    bannerFileInputRef.current.value = '';
                                  }
                                }}
                                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => bannerFileInputRef.current?.click()}
                            className="w-full px-4 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Choose Different File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
                    <button
                      onClick={resetBannerModal}
                      disabled={banner.uploading || banner.updating}
                      className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 font-medium"
                    >
                      Cancel
                    </button>
                    {selectedBannerFile && (
                      <button
                        onClick={handleUploadBanner}
                        disabled={banner.uploading || banner.updating}
                        className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[140px] justify-center"
                      >
                        {banner.uploading || banner.updating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {hasExistingBanner ? 'Updating...' : 'Uploading...'}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {hasExistingBanner ? 'Update Banner' : 'Upload Banner'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Delete Confirmation */
                <>
                  <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                        <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                          Remove Banner
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          This action cannot be undone
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="aspect-[3/1] rounded-xl overflow-hidden">
                        <img
                          src={companyBanner}
                          alt="Banner to be deleted"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        Are you sure you want to remove your company banner? This will permanently delete the current banner image.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
                    <button
                      onClick={() => setShowBannerDeleteConfirm(false)}
                      disabled={banner.deleting}
                      className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteBanner}
                      disabled={banner.deleting}
                      className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[140px] justify-center"
                    >
                      {banner.deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Remove Banner
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Information Modal */}
      {businessProfile?.profileId && (
        <BusinessPrivateInfoForm
          isOpen={showPrivateInfoModal}
          profileId={businessProfile.profileId}
          onClose={() => setShowPrivateInfoModal(false)}
        />
      )}
      
      {/* Self-Demotion Confirmation Modal */}
      <AnimatePresence>
        {showDemoteSelfConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !demotingSelf && setShowDemoteSelfConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md mx-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <ChevronDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Demote to Editor
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      This will reduce your permissions
                    </p>
                  </div>
                </div>
                {!demotingSelf && (
                  <button
                    onClick={() => setShowDemoteSelfConfirm(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ChevronDown className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                    Demote Yourself to Editor
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Are you sure you want to demote yourself from <strong>Admin</strong> to <strong>Editor</strong>? 
                    You will lose admin privileges including the ability to manage team members and some business settings.
                  </p>
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Note:</strong> Only the business owner can promote you back to Admin.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
                <button
                  onClick={() => setShowDemoteSelfConfirm(false)}
                  disabled={demotingSelf}
                  className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDemoteSelf}
                  disabled={demotingSelf}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {demotingSelf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Demoting...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Demote to Editor
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