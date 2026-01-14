/**
 * Notification Badge Component
 * Displays a count badge on icons (like Bell, Users, etc.)
 */
'use client';

import { cn } from '@/lib/utils';

export interface NotificationBadgeProps {
  /** Count to display */
  count: number;
  /** Maximum count to display before showing "99+" */
  maxCount?: number;
  /** Show badge even when count is 0 */
  showZero?: boolean;
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
  /** Position of the badge relative to parent */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Badge component for displaying notification counts
 * 
 * @example
 * ```tsx
 * <div className="relative">
 *   <Bell className="h-6 w-6" />
 *   <NotificationBadge count={5} />
 * </div>
 * ```
 */
export function NotificationBadge({
  count,
  maxCount = 99,
  showZero = false,
  size = 'md',
  className,
  position = 'top-right',
}: NotificationBadgeProps) {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Format count display
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Size variants
  const sizeClasses = {
    sm: 'h-4 w-4 text-[10px] min-w-[16px]',
    md: 'h-5 w-5 text-[11px] min-w-[20px]',
    lg: 'h-6 w-6 text-xs min-w-[24px]',
  };

  // Position variants
  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
  };

  return (
    <span
      className={cn(
        'absolute flex items-center justify-center',
        'bg-red-500 text-white font-bold rounded-full',
        'ring-2 ring-white dark:ring-neutral-950',
        'animate-in fade-in zoom-in duration-200',
        sizeClasses[size],
        positionClasses[position],
        className
      )}
      aria-label={`${count} notification${count !== 1 ? 's' : ''}`}
    >
      {displayCount}
    </span>
  );
}

/**
 * Inline badge variant (not absolutely positioned)
 */
export function InlineNotificationBadge({
  count,
  maxCount = 99,
  showZero = false,
  size = 'md',
  className,
}: Omit<NotificationBadgeProps, 'position'>) {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] min-w-[18px]',
    md: 'px-2 py-0.5 text-[11px] min-w-[22px]',
    lg: 'px-2.5 py-1 text-xs min-w-[26px]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'bg-red-500 text-white font-bold rounded-full',
        sizeClasses[size],
        className
      )}
      aria-label={`${count} notification${count !== 1 ? 's' : ''}`}
    >
      {displayCount}
    </span>
  );
}
