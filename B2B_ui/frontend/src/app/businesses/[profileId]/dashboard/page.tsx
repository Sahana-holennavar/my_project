"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchUserBusinessProfiles, setSelectedProfile, type BusinessProfileState } from "@/store/slices/businessProfileSlice";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Settings,
  BarChart3,
  Shield,
  Building2,
  Loader2,
  AlertCircle,
  UserCog,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "@/types/auth";

// Tab components
import { UserManagementTab } from "../../../../components/dashboard/UserManagementTab";
import { BusinessSettingsTab } from "../../../../components/dashboard/BusinessSettingsTab";
import { AnalyticsTab } from "../../../../components/dashboard/AnalyticsTab";
import JobManagementTab from "../../../../components/dashboard/JobManagementTab";

type TabKey = 'analytics' | 'user-management' | 'business-settings' | 'job-management';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  allowedRoles: string[];
}

const TABS: TabConfig[] = [
  {
    key: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'View business metrics and insights',
    allowedRoles: ['owner', 'admin'],
  },
  {
    key: 'user-management',
    label: 'User Management',
    icon: UserCog,
    description: 'Manage team members and permissions',
    allowedRoles: ['owner', 'admin'],
  },
  {
    key: 'job-management',
    label: 'Job Management',
    icon: Briefcase,
    description: 'Manage job postings and applications',
    allowedRoles: ['owner', 'admin'],
  },
  {
    key: 'business-settings',
    label: 'Business Profile',
    icon: Building2,
    description: 'Manage business information and settings',
    allowedRoles: ['owner'],
  },
];

export default function BusinessDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const profileId = params?.profileId as string;
  
  const { 
    selectedProfile,
    profiles,
    fetching: fetchingProfiles
  } = useAppSelector((state: { businessProfile: BusinessProfileState }) => state.businessProfile);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('user-management');

  // Refresh profile data function
  const refreshProfile = async () => {
    if (!profileId) return;
    
    try {
      // Fetch all business profiles including inactive ones
      const profilesResult = await dispatch(fetchUserBusinessProfiles({ includeInactive: true })).unwrap();
      
      // Find the specific profile
      const currentProfile = profilesResult.find((profile: BusinessProfile) => profile.profileId === profileId);
      
      if (currentProfile) {
        dispatch(setSelectedProfile(currentProfile));
      }
    } catch (err: unknown) {
      console.error("Failed to refresh business profile:", err);
    }
  };

  // Get allowed tabs based on user role
  const allowedTabs = TABS.filter(tab => 
    tab.allowedRoles.includes(selectedProfile?.role || '')
  );

  // Set default active tab to first allowed tab
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.find(tab => tab.key === activeTab)) {
      setActiveTab(allowedTabs[0].key);
    }
  }, [allowedTabs, activeTab]);

  // Fetch business profile data
  useEffect(() => {
    if (!profileId) {
      setError("Invalid business profile ID");
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Fetch all business profiles including inactive ones
        // This allows owners to access their own inactive business profiles
        const profilesResult = await dispatch(fetchUserBusinessProfiles({ includeInactive: true })).unwrap();
        
        // Find the specific profile
        const currentProfile = profilesResult.find((profile: BusinessProfile) => profile.profileId === profileId);
        
        if (currentProfile) {
          dispatch(setSelectedProfile(currentProfile));
          
          // Check if user has access to dashboard
          if (!['owner', 'admin'].includes(currentProfile.role)) {
            setError("You don't have permission to access this dashboard");
            setLoading(false);
            return;
          }
        } else {
          throw new Error("Business profile not found");
        }
        
        setLoading(false);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to fetch business profile:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load business profile data";
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId, dispatch]);

  const handleGoBack = () => {
    if (profileId) {
      router.push(`/businesses/${profileId}`);
    } else {
      router.push('/businesses');
    }
  };

  // Loading state
  if (loading || fetchingProfiles) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !selectedProfile) {
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
            Access Denied
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {error || "You don't have permission to access this dashboard"}
          </p>
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoBack}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Business Profile</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
                    Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {selectedProfile.businessName || selectedProfile.companyProfileData?.companyName}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end sm:gap-2">
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                selectedProfile.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
              }`}>
                {selectedProfile.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  Business Management
                </h2>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                  Manage your business settings, team, and view analytics
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                {allowedTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl transition-all duration-200 text-sm font-medium w-full sm:w-auto ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'analytics' && <AnalyticsTab businessProfile={selectedProfile} />}
          {activeTab === 'user-management' && <UserManagementTab businessProfile={selectedProfile} />}
          {activeTab === 'job-management' && <JobManagementTab businessProfile={selectedProfile} />}
          {activeTab === 'business-settings' && <BusinessSettingsTab businessProfile={selectedProfile} onProfileUpdate={refreshProfile} />}
        </motion.div>
      </div>
    </div>
  );
}