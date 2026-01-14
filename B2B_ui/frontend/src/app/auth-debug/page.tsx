'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStorage } from '@/lib/tokens';

export default function AuthDebugPage() {
  const [authState, setAuthState] = useState<{
    hasTokens: boolean;
    accessToken: string | null;
    refreshToken: string | null;
    cookies: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const tokens = tokenStorage.getStoredTokens();
    setAuthState({
      hasTokens: !!tokens,
      accessToken: tokens?.access_token ? `${tokens.access_token.substring(0, 20)}...` : null,
      refreshToken: tokens?.refresh_token ? `${tokens.refresh_token.substring(0, 20)}...` : null,
      cookies: document.cookie,
    });
  }, []);

  const handleLogout = () => {
    // Clear tokens
    tokenStorage.clearTokens();
    // Force reload to clear any cached state
    window.location.href = '/login';
  };

  const handleTestProtectedRoute = () => {
    router.push('/feed');
  };

  const handleTestPublicRoute = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-neutral-900 dark:text-white">
          Authentication Debug Page
        </h1>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">
            Current Auth State
          </h2>
          
          {authState ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Has Tokens:
                </span>
                <span className={`font-mono px-2 py-1 rounded ${
                  authState.hasTokens 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {authState.hasTokens ? 'YES ✓' : 'NO ✗'}
                </span>
              </div>

              <div>
                <span className="font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                  Access Token:
                </span>
                <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-xs break-all text-neutral-900 dark:text-neutral-100">
                  {authState.accessToken || 'None'}
                </code>
              </div>

              <div>
                <span className="font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                  Refresh Token:
                </span>
                <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-xs break-all text-neutral-900 dark:text-neutral-100">
                  {authState.refreshToken || 'None'}
                </code>
              </div>

              <div>
                <span className="font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                  Cookies:
                </span>
                <code className="block bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-xs break-all text-neutral-900 dark:text-neutral-100">
                  {authState.cookies || 'None'}
                </code>
              </div>
            </div>
          ) : (
            <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
          )}
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">
            Route Protection Info
          </h2>
          
          <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            <p><strong>Public Routes (no auth required):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>/ (home)</li>
              <li>/login</li>
              <li>/register</li>
              <li>/forgot-password</li>
              <li>/privacy</li>
              <li>/terms</li>
              <li>/faq</li>
            </ul>

            <p className="mt-4"><strong>Protected Routes (auth required):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>/feed - Feed page</li>
              <li>/profile - Your profile</li>
              <li>/user/:id - Other user profiles</li>
              <li>/connections - Connections</li>
              <li>/notifications - Notifications</li>
              <li>/settings/* - All settings pages</li>
            </ul>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
          <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">
            Actions
          </h2>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestProtectedRoute}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Test Protected Route (/feed)
            </button>

            <button
              onClick={handleTestPublicRoute}
              className="px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Test Public Route (/)
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout & Clear Tokens
            </button>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> If you&apos;re logged in and try to access /feed, you&apos;ll see the feed.
              Click &quot;Logout & Clear Tokens&quot; then try accessing /feed again - you should be redirected to /login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
