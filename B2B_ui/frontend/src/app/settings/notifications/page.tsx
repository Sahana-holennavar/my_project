"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell } from 'lucide-react';

const NotificationsPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-neutral-100 dark:bg-neutral-950 font-sans transition-colors">
      <header className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 h-auto rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Notification Settings
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Manage your notification preferences
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/70 rounded-3xl p-8 sm:p-12"
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
              Coming Soon
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              Notification settings are currently under development. Check back soon to customize your notification preferences.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default NotificationsPage;
