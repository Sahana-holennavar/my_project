"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessProfileApi } from "@/lib/api";
import { toast } from "sonner";
import type { BusinessProfile } from "@/types/auth";
import { BusinessPrivateInfoForm } from "@/components/business-profile/BusinessPrivateInfoForm";

interface BusinessSettingsTabProps {
  businessProfile: BusinessProfile;
  onProfileUpdate?: () => void;
}

export function BusinessSettingsTab({ businessProfile, onProfileUpdate }: BusinessSettingsTabProps) {
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showPrivateInfoModal, setShowPrivateInfoModal] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleDeactivate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = businessProfile.isActive 
        ? await businessProfileApi.deactivateBusinessProfile(businessProfile.profileId)
        : await businessProfileApi.reactivateBusinessProfile(businessProfile.profileId);
      
      if (response.success && response.data) {
        setActionSuccess(
          response.data.isActive
            ? 'Business profile has been activated successfully'
            : 'Business profile has been deactivated successfully'
        );
        
        // Show success toast
        toast.success(
          response.data.isActive
            ? 'Business profile activated'
            : 'Business profile deactivated'
        );
        
        // Trigger parent component refresh to update the profile data
        if (onProfileUpdate) {
          onProfileUpdate();
        }
        
        setTimeout(() => setActionSuccess(null), 5000);
      } else {
        setError(response.message || 'Failed to update business profile status');
        toast.error(response.message || 'Failed to update business profile');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update business profile status';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
      setShowDeactivateConfirm(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await businessProfileApi.deleteBusinessProfile(businessProfile.profileId);
      
      if (response.success && response.data) {
        setActionSuccess('Business profile has been deleted successfully');
        
        // Show success toast
        toast.success('Business profile deleted successfully');
        
        // Redirect to businesses list after successful deletion
        setTimeout(() => {
          window.location.href = '/businesses';
        }, 2000);
      } else {
        setError(response.message || 'Failed to delete business profile');
        toast.error(response.message || 'Failed to delete business profile');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete business profile';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to delete profile:', error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const profileData = businessProfile.companyProfileData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Business Profile Management
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Manage your business profile and perform owner actions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {actionSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-green-600 dark:text-green-400"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{actionSuccess}</span>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Confidential Information - Owner Only */}
      {businessProfile.role === 'owner' && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Confidential Information
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Manage private and confidential business information
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowPrivateInfoModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Shield className="h-4 w-4 mr-2" />
              Manage Confidential Info
            </Button>
          </div>
          
          <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-700 dark:text-red-300 text-sm">
              <strong>Note:</strong> This section contains sensitive business information that is only accessible to the business owner. 
              It includes private data such as financial information, legal documents, and other confidential business details.
            </p>
          </div>
        </div>
      )}

      {/* Owner Actions */}
      {businessProfile.role === 'owner' && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
            Owner Actions
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-white mb-1">
                  {businessProfile.isActive ? 'Deactivate Business Profile' : 'Activate Business Profile'}
                </h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {businessProfile.isActive 
                    ? 'Temporarily hide your business profile from public view'
                    : 'Make your business profile visible to the public again'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeactivateConfirm(true)}
                disabled={loading}
                className={businessProfile.isActive 
                  ? "border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                  : "border-green-300 text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"}
              >
                {businessProfile.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-white mb-1">
                  Delete Business Profile
                </h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Permanently delete this business profile. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Delete Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeactivateConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
              {businessProfile.isActive ? 'Deactivate' : 'Activate'} Business Profile
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {businessProfile.isActive 
                ? 'Are you sure you want to deactivate this business profile? It will be hidden from public view.'
                : 'Are you sure you want to activate this business profile? It will be visible to the public.'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeactivateConfirm(false)} disabled={loading}>
                Cancel
              </Button>
              <Button 
                onClick={handleDeactivate}
                disabled={loading}
                className={businessProfile.isActive 
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  businessProfile.isActive ? 'Deactivate' : 'Activate'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 text-center">
              Delete Business Profile
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-center">
              This action cannot be undone. All data associated with this business profile will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
                Cancel
              </Button>
              <Button 
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Profile'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Private Information Modal */}
      <BusinessPrivateInfoForm
        isOpen={showPrivateInfoModal}
        profileId={businessProfile.profileId}
        onClose={() => setShowPrivateInfoModal(false)}
      />
    </motion.div>
  );
}