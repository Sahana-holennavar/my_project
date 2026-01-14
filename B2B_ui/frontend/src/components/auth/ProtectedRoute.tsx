'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback = null 
}) => {
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // If authenticated but user role is not assigned, redirect to role selection
    if (isAuthenticated && user && !user.role) {
      router.push('/select-role');
      return;
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show fallback or nothing (redirect will happen)
  if (!isAuthenticated) {
    return fallback;
  }

  // If authenticated but no role assigned, show loading (redirect will happen)
  if (isAuthenticated && user && !user.role) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-sm">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};