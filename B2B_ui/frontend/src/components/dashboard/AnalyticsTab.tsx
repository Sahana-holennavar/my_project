"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  Globe,
  MessageSquare,
  Star,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "@/types/auth";

interface AnalyticsTabProps {
  businessProfile: BusinessProfile;
}

interface AnalyticsData {
  profileViews: {
    total: number;
    change: number;
    period: string;
  };
  inquiries: {
    total: number;
    change: number;
    period: string;
  };
  connections: {
    total: number;
    change: number;
    period: string;
  };
  rating: {
    average: number;
    total: number;
    change: number;
  };
  monthlyViews: number[];
  topReferrers: Array<{
    source: string;
    views: number;
    change: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'view' | 'inquiry' | 'connection' | 'review';
    description: string;
    timestamp: string;
  }>;
}

export function AnalyticsTab({ businessProfile }: AnalyticsTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Business Analytics
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Track your business profile performance and engagement
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-12">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            Analytics Coming Soon
          </h3>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
            We&apos;re working on comprehensive analytics features to help you track your business profile performance, engagement metrics, and insights.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium">
            <Activity className="h-4 w-4" />
            Feature in Development
          </div>
        </div>
      </div>
    </motion.div>
  );
}