"use client";

import { motion } from "framer-motion";
import { Mail, Phone, Globe, ExternalLink } from "lucide-react";
import type { BusinessProfile } from "@/types/auth";

interface BusinessContactSectionProps {
  businessProfile: BusinessProfile | null;
  delay?: number;
}

export const BusinessContactSection = ({ businessProfile, delay = 0.2 }: BusinessContactSectionProps) => {
  const companyData = businessProfile?.companyProfileData;
  
  // Use new top-level fields from API response with fallbacks to nested data
  const primaryEmail = businessProfile?.primary_email || companyData?.primary_email;
  const companyWebsite = businessProfile?.company_website || companyData?.company_website;
  const phoneNumber = companyData?.phone_number; // This field is only in nested data
  const additionalEmails = businessProfile?.additional_emails || companyData?.additional_email;
  const additionalPhones = companyData?.additional_phone_numbers;
  
  // Check if there's any contact information to display
  const hasContactData = primaryEmail || companyWebsite || phoneNumber || 
    (additionalEmails && additionalEmails.length > 0) ||
    (additionalPhones && additionalPhones.length > 0);
  
  // Don't render if no contact data is available
  if (!hasContactData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-6 sm:p-8 mb-8"
    >
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
        <Mail className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        Contact Information
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {primaryEmail && (
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-neutral-500" />
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Email</p>
              <a href={`mailto:${primaryEmail}`} className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
                {primaryEmail}
              </a>
            </div>
          </div>
        )}
        {phoneNumber && (
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-neutral-500" />
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Phone</p>
              <a href={`tel:${phoneNumber}`} className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
                {phoneNumber}
              </a>
            </div>
          </div>
        )}
        {companyWebsite && (
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-neutral-500" />
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">Website</p>
              <a href={companyWebsite} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1">
                Visit Website
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>
      
      {/* Additional Contact Information */}
      {((additionalEmails && Array.isArray(additionalEmails) && additionalEmails.length > 0) ||
        (additionalPhones && Array.isArray(additionalPhones) && additionalPhones.length > 0)) && (
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Additional Contact</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {additionalEmails && Array.isArray(additionalEmails) && additionalEmails.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-400" />
                <a href={`mailto:${email.email}`} className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm">
                  {email.email}
                </a>
              </div>
            ))}
            {additionalPhones && Array.isArray(additionalPhones) && additionalPhones.map((phone, index) => (
              <div key={index} className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-neutral-400" />
                <a href={`tel:${phone.phone_number}`} className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm">
                  {phone.phone_number}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};