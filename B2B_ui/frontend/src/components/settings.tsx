'use client'

import React from 'react';
import AccountDeactivationSection from '../app/account/accountSettings';

const Settings: React.FC = () => {
  return (
    <div className="settings-page min-h-screen bg-background dark:bg-black py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your account preferences and settings
          </p>
        </div>

        {/* Account Management Section */}
        <AccountDeactivationSection />
      </div>
    </div>
  );
};

export default Settings;
