'use client';

import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { ApplicationDetails, MyApplication } from '@/types/jobs';

interface WithdrawActionButtonProps {
  application: ApplicationDetails | MyApplication;
  onWithdraw: () => void;
  loading?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function WithdrawActionButton({
  application,
  onWithdraw,
  loading = false,
  variant = 'outline',
  size = 'default',
}: WithdrawActionButtonProps) {
  const isWithdrawable = application.status === 'applied' || application.status === 'pending';

  if (!isWithdrawable) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onWithdraw}
      disabled={loading}
      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {loading ? 'Withdrawing...' : 'Withdraw Application'}
    </Button>
  );
}

