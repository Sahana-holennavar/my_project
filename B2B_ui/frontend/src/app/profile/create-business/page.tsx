"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createBusinessProfile, clearError } from "@/store/slices/businessProfileSlice";
import { BusinessProfileForm, BusinessProfileFormData } from "@/components/BusinessProfileForm";
import { SuccessPopup } from "@/components/SuccessPopup";
import type { CreatedBusinessProfile } from "@/types/auth";
import { motion } from "framer-motion";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CreateBusinessProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const { creating, error } = useAppSelector((state) => state.businessProfile);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<CreatedBusinessProfile | null>(null);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, user, router]);

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error("Failed to create business profile", {
        description: error,
      });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleFormSubmit = async (formData: BusinessProfileFormData) => {
    try {
      const result = await dispatch(createBusinessProfile({
        companyName: formData.companyName,
        company_logo: formData.company_logo,
        company_type: formData.company_type,
        company_website: formData.company_website,
        tagline: formData.tagline,
        industry: formData.industry,
        company_size: formData.company_size,
        headquater_location: formData.headquater_location,
        location: formData.location,
        primary_email: formData.primary_email,
        additional_email: formData.additional_email,
        phone_number: formData.phone_number,
        additional_phone_numbers: formData.additional_phone_numbers,
        privacy_settings: formData.privacy_settings,
      })).unwrap();
      
      setCreatedProfile(result);
      setShowSuccessPopup(true);
      
      // Removed toast notification - only show the main modal popup
    } catch (error) {
      // Error is handled by the useEffect above
      console.error("Failed to create business profile:", error);
    }
  };

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    // Redirect to profile page
    router.push("/businesses");
  };

  const handleBackToBusinesses = () => {
    router.push("/businesses");
  };

  // Show loading while checking authentication
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToBusinesses}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Businesses
            </Button>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Create Business Profile
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Establish your business presence on the platform
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Note:</strong> Your business profile will be separate from your personal profile and can be managed independently.
            </p>
          </div>
        </motion.div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8"
        >
          <BusinessProfileForm
            onSubmit={handleFormSubmit}
            loading={creating}
          />
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Need Help?
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <div>
              <strong>Company Name:</strong> Enter your official business name as registered.
            </div>
            <div>
              <strong>Industry:</strong> Specify the primary industry or sector your business operates in.
            </div>
            <div>
              <strong>Company Type:</strong> Select the legal structure of your business (Corporation, LLC, etc.).
            </div>
            <div>
              <strong>Primary Email:</strong> Use a business email that customers can contact you on.
            </div>
            <div>
              <strong>Company Logo:</strong> Upload a clear, professional logo that represents your brand (optional but recommended).
            </div>
            <div>
              <strong>Privacy Settings:</strong> Control who can see your profile and contact information.
            </div>
          </div>
        </motion.div>
      </div>

      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        message="Business Profile Created!"
        description="Your business profile has been successfully created and is now active on the platform."
        onClose={handleSuccessPopupClose}
        actionLabel="View Profile"
        onAction={handleSuccessPopupClose}
      />
    </div>
  );
}