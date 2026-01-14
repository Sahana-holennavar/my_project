'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { contestApi } from '@/lib/api';

export function FloatingChallengeIcon() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasActiveContest, setHasActiveContest] = useState(false);

  useEffect(() => {
    checkActiveContests();
  }, []);

  const checkActiveContests = async () => {
    try {
      const response = await contestApi.getAllContests(1, 100);
      if (response.success && response.data && response.data.contests) {
        const now = new Date();
        // Check if any contest is active and within time range
        const activeContest = response.data.contests.some(contest => {
          const startTime = new Date(contest.start_time);
          const endTime = new Date(contest.end_time);
          return contest.status === 'active' && now >= startTime && now <= endTime;
        });
        setHasActiveContest(activeContest);
      }
    } catch {
      // Silently fail - don't show icon if there's an error
      setHasActiveContest(false);
    }
  };

  // Don't show the icon if already on challenge page or no active contest
  if (pathname === '/challenge' || pathname.startsWith('/challenge/') || !hasActiveContest) {
    return null;
  }

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.push('/challenge')}
      className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
      aria-label="Go to Challenge Page"
    >
      <Trophy className="w-6 h-6" />
    </motion.button>
  );
}
