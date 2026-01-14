"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import type { BusinessProfile } from "@/types/auth";

interface BusinessDetailsSectionProps {
  businessProfile: BusinessProfile | null;
  delay?: number;
}

export const BusinessDetailsSection = ({ businessProfile, delay = 0.5 }: BusinessDetailsSectionProps) => {
  const companyData = businessProfile?.companyProfileData;
  
  // Use new response structure fields with fallbacks to nested data
  const companyIndustry = businessProfile?.industry || companyData?.industry;
  const companyType = businessProfile?.company_type || companyData?.company_type;
  const companySize = businessProfile?.company_size || companyData?.company_size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-6 sm:p-8 mb-8"
    >
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
        <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        Company Details
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">Company Type</p>
          <p className="text-neutral-600 dark:text-neutral-400">{companyType || 'Not specified'}</p>
        </div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">Industry</p>
          <p className="text-neutral-600 dark:text-neutral-400">{companyIndustry || 'Not specified'}</p>
        </div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">Company Size</p>
          <p className="text-neutral-600 dark:text-neutral-400">
            {companySize ? `${companySize} employees` : 'Not specified'}
          </p>
        </div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">Joined</p>
          <p className="text-neutral-600 dark:text-neutral-400">
            {businessProfile?.joinedAt ? new Date(businessProfile.joinedAt).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">Last Active</p>
          <p className="text-neutral-600 dark:text-neutral-400">
            {businessProfile?.lastActive ? new Date(businessProfile.lastActive).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
        {/* <div>
          <p className="font-medium text-neutral-900 dark:text-white mb-1">Your Role</p>
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
            businessProfile?.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
            businessProfile?.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
            'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
          }`}>
            {businessProfile?.role || 'Unknown'}
          </span>
        </div> */}
      </div>
    </motion.div>
  );
};