"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Bell, 
  Check, 
  X, 
  Loader2,
  UserPlus,
  AlertCircle,
  Building2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toast, useToast } from '@/components/ui/toast';
import { 
  getNotifications, 
  markNotificationAsRead,
  type NotificationItem as APINotificationItem,
  type NotificationStatus 
} from '@/lib/api/notifications';
import { acceptConnectionRequest, rejectConnectionRequest } from '@/lib/api/connections';
import { formatTimeAgo } from '@/lib/utils/dateTime';
import { businessProfileApi } from '@/lib/api';

// --- TYPES ---
interface Notification extends APINotificationItem {
  id: string; // Map notification_id to id for UI
}

interface BusinessInvitation {
  invitationId: string;
  profileId: string;
  profileName: string;
  profileLogo: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: {
    userId: string;
    name: string;
    email: string;
    avatar?: {
      fileId: string;
      fileUrl: string;
      fileName: string;
      uploadedAt: string;
    };
  };
  message: string;
  createdAt: string;
}

type TabType = 'connections' | 'business';

// --- AVATAR COMPONENT ---
const Avatar = ({ name, className = '' }: { name: string; className?: string }) => {
  const initials = (name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U';

  return (
    <div className={`relative rounded-full flex items-center justify-center overflow-hidden shrink-0 ${className || 'w-10 h-10'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
        <span className="text-white font-semibold text-sm">{initials}</span>
      </div>
    </div>
  );
};

// --- NOTIFICATION ITEM ---
const NotificationItem = ({ 
  notification, 
  onAction 
}: { 
  notification: Notification; 
  onAction: (id: string, action: 'approve' | 'reject') => Promise<void>;
}) => {
  const router = useRouter();
  const [actionState, setActionState] = useState<'approving' | 'rejecting' | 'approved' | 'rejected' | null>(null);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);

  const isPending = notification.connect_request === 'pending';
  const isAccepted = notification.connect_request === 'accepted';
  const isRejected = notification.connect_request === 'rejected';

  // Mark accepted/rejected notifications as read when first viewed
  useEffect(() => {
    const markAsRead = async () => {
      if ((isAccepted || isRejected) && !notification.is_read && !hasMarkedAsRead) {
        setHasMarkedAsRead(true);
        try {
          await markNotificationAsRead(notification.notification_id);
          console.log('Notification marked as read:', notification.notification_id);
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      }
    };

    markAsRead();
  }, [isAccepted, isRejected, notification.is_read, notification.notification_id, hasMarkedAsRead]);

  const itemVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      transition: { duration: 0.2 } 
    }
  };

  const handleAction = async (e: React.MouseEvent, actionType: 'approve' | 'reject') => {
    e.stopPropagation();
    setActionState(actionType === 'approve' ? 'approving' : 'rejecting');
    
    try {
      await onAction(notification.notification_id, actionType);
      // Show success state briefly before component is removed
      setActionState(actionType === 'approve' ? 'approved' : 'rejected');
    } catch (error) {
      // If action fails, reset state so user can try again
      console.error('Action failed:', error);
      setActionState(null);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Use sender_details.id to ensure we're using the correct sender ID
    router.push(`/user/${notification.sender_details.id}`);
  };

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={handleProfileClick}
      className={`
        relative border-b border-neutral-200 dark:border-neutral-800 px-4 py-4 
        transition-all duration-200 cursor-pointer
        ${!notification.is_read ? 'bg-purple-50/50 dark:bg-purple-950/10' : 'bg-white dark:bg-neutral-900'}
        hover:bg-neutral-50 dark:hover:bg-neutral-800/50
      `}
    >
      <div className="flex items-start gap-3">
        <div onClick={handleProfileClick} className="cursor-pointer">
          <Avatar name={notification.sender_details.name} className="w-12 h-12" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1">
              <p className="text-sm text-neutral-900 dark:text-neutral-100">
                <span 
                  onClick={handleProfileClick}
                  className="font-semibold hover:underline cursor-pointer"
                >
                  {notification.sender_details.name}
                </span>
                {' '}
                {notification.connect_request === 'accepted' 
                  ? 'accepted your connection request' 
                  : notification.connect_request === 'rejected'
                  ? 'rejected your connection request'
                  : notification.message}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {(() => {
                  const timestamp = notification.created_at;
                  const formatted = formatTimeAgo(timestamp);
                  
                  const notifDate = new Date(timestamp);
                  const currentDate = new Date();
                  const diffMs = currentDate.getTime() - notifDate.getTime();
                  const diffMin = Math.floor(diffMs / (1000 * 60));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  return formatted;
                })()}
              </p>
            </div>
            
            <UserPlus className="w-5 h-5 text-purple-500 flex-shrink-0" />
          </div>

          {/* Connection Request Actions */}
          {isPending && (
            <AnimatePresence mode="wait">
              {!actionState ? (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex gap-2 mt-3"
                >
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => handleAction(e, 'approve')}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <Check size={16} className="mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleAction(e, 'reject')}
                    className="flex-1"
                  >
                    <X size={16} className="mr-1" /> Decline
                  </Button>
                </motion.div>
              ) : actionState === 'approving' ? (
                <motion.div
                  key="approving"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-3 text-center text-sm"
                >
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Accepting...</span>
                  </div>
                </motion.div>
              ) : actionState === 'rejecting' ? (
                <motion.div
                  key="rejecting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-3 text-center text-sm"
                >
                  <div className="flex items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Declining...</span>
                  </div>
                </motion.div>
              ) : actionState === 'approved' ? (
                <motion.div
                  key="approved"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-3 text-center text-sm"
                >
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                    <Check size={16} />
                    <span>Accepted!</span>
                  </div>
                </motion.div>
              ) : actionState === 'rejected' ? (
                <motion.div
                  key="rejected"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-3 text-center text-sm"
                >
                  <div className="flex items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400 font-semibold">
                    <Check size={16} />
                    <span>Declined</span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          )}

          {/* Status badges for accepted/rejected */}
          
          {isRejected && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <X size={14} /> Declined
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.is_read && (
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0 mt-1" title="Unread" />
        )}
      </div>
    </motion.div>
  );
};

// --- BUSINESS INVITATION ITEM ---
const BusinessInvitationItem = ({ 
  invitation, 
  onAction 
}: { 
  invitation: BusinessInvitation; 
  onAction: (id: string, action: 'accept' | 'decline') => Promise<void>;
}) => {
  const [actionState, setActionState] = useState<'accepting' | 'declining' | 'accepted' | 'declined' | null>(null);

  const itemVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      transition: { duration: 0.2 } 
    }
  };

  const handleAction = async (e: React.MouseEvent, actionType: 'accept' | 'decline') => {
    e.stopPropagation();
    setActionState(actionType === 'accept' ? 'accepting' : 'declining');
    
    try {
      await onAction(invitation.invitationId, actionType);
      setActionState(actionType === 'accept' ? 'accepted' : 'declined');
    } catch (error) {
      console.error('Action failed:', error);
      setActionState(null);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const isPending = invitation.status === 'pending';
  const isAccepted = invitation.status === 'accepted';
  const isDeclined = invitation.status === 'declined';

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`
        relative border-b border-neutral-200 dark:border-neutral-800 px-4 py-4 
        transition-all duration-200
        ${isPending ? 'bg-blue-50/50 dark:bg-blue-950/10' : 'bg-white dark:bg-neutral-900'}
        hover:bg-neutral-50 dark:hover:bg-neutral-800/50
      `}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
          {invitation.profileLogo ? (
            <img
              src={invitation.profileLogo}
              alt={invitation.profileName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1">
              <p className="text-sm text-neutral-900 dark:text-neutral-100">
                <span className="font-semibold">{invitation.invitedBy.name}</span>
                {' invited you to join '}
                <span className="font-semibold">{invitation.profileName}</span>
                {' as '}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  invitation.role === 'admin' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                }`}>
                  <Shield className="w-3 h-3" />
                  {invitation.role}
                </span>
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {getTimeAgo(invitation.createdAt)}
              </p>
            </div>
            
            <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
          </div>

          {/* Business Invitation Actions */}
          {isPending && (
            <AnimatePresence mode="wait">
              {!actionState ? (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex gap-2 mt-3"
                >
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => handleAction(e, 'accept')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Check size={16} className="mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleAction(e, 'decline')}
                    className="flex-1"
                  >
                    <X size={16} className="mr-1" /> Decline
                  </Button>
                </motion.div>
              ) : actionState === 'accepting' ? (
                <motion.div
                  key="accepting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-3 text-center text-sm"
                >
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Accepting...</span>
                  </div>
                </motion.div>
              ) : actionState === 'declining' ? (
                <motion.div
                  key="declining"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-3 text-center text-sm"
                >
                  <div className="flex items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Declining...</span>
                  </div>
                </motion.div>
              ) : actionState === 'accepted' ? (
                <motion.div
                  key="accepted"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-3 text-center text-sm"
                >
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                    <Check size={16} />
                    <span>Accepted!</span>
                  </div>
                </motion.div>
              ) : actionState === 'declined' ? (
                <motion.div
                  key="declined"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-3 text-center text-sm"
                >
                  <div className="flex items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400 font-semibold">
                    <Check size={16} />
                    <span>Declined</span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          )}

          {/* Status badges for accepted/declined */}
          {isAccepted && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check size={14} /> Accepted
            </div>
          )}
          {isDeclined && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <X size={14} /> Declined
            </div>
          )}
        </div>

        {/* Pending indicator */}
        {isPending && (
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" title="Pending" />
        )}
      </div>
    </motion.div>
  );
};

// --- NOTIFICATIONS PAGE ---
const NotificationsPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('connections');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [businessInvitations, setBusinessInvitations] = useState<BusinessInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [businessPendingCount, setBusinessPendingCount] = useState(0);
  const { toast, showToast, hideToast } = useToast();

  // Fetch notifications
  useEffect(() => {
    if (activeTab === 'connections') {
      fetchNotifications();
    } else {
      fetchBusinessInvitations();
    }
  }, [activeTab]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getNotifications({
        page: 1,
        limit: 50,
        status: 'all',
        type: 'connect_request',
      });

      if (response.success && response.data) {
        // Map API notifications to UI format
        const mappedNotifications: Notification[] = response.data.notifications.map(n => ({
          ...n,
          id: n.notification_id,
        }));

        // Remove duplicate notifications (same sender sending multiple requests)
        // Keep only the latest notification from each sender
        const seen = new Set<string>();
        const deduplicatedNotifications = mappedNotifications.filter(notification => {
          const senderKey = `${notification.sender_id}`;
          if (seen.has(senderKey)) {
            return false; // Skip duplicate
          }
          seen.add(senderKey);
          return true; // Keep first occurrence
        });

        setNotifications(deduplicatedNotifications);
        setUnreadCount(response.data.unread_count);
        setPendingCount(response.data.pending_count);
      } else {
        setError(response.message || 'Failed to load notifications');
        showToast(response.message || 'Failed to load notifications', 'error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessInvitations = async () => {
    try {
      setBusinessLoading(true);
      setBusinessError(null);

      // Fetch all invitations (pending, accepted, declined) using status=all
      const response = await businessProfileApi.getReceivedInvitations('all');

      if (response.success && response.data) {
        setBusinessInvitations(response.data.invitations);
        setBusinessPendingCount(response.data.summary.pending);
      } else {
        setBusinessError(response.message || 'Failed to load business invitations');
        showToast(response.message || 'Failed to load business invitations', 'error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setBusinessError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setBusinessLoading(false);
    }
  };

  const handleNotificationAction = async (notificationId: string, action: 'approve' | 'reject'): Promise<void> => {
    // Find the notification to get sender_id
    const notification = notifications.find(n => n.notification_id === notificationId);
    if (!notification) {
      showToast('Notification not found', 'error');
      throw new Error('Notification not found');
    }

    try {
      const otherUserId = notification.sender_id;
      if (action === 'approve') {
        const response = await acceptConnectionRequest(otherUserId);
        if (response.success) {
          showToast(response.message || 'Connection request accepted!', 'success');
          await new Promise(resolve => setTimeout(resolve, 1000));
          setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
          setPendingCount(prev => Math.max(0, prev - 1));
          setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
          const errorMsg = response.errors?.[0]?.message || response.message || 'Failed to accept connection request';
          showToast(errorMsg, 'error');
          throw new Error(errorMsg);
        }
      } else {
        const response = await rejectConnectionRequest(otherUserId);
        if (response.success) {
          showToast(response.message || 'Connection request declined', 'info');
          await new Promise(resolve => setTimeout(resolve, 1000));
          setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
          setPendingCount(prev => Math.max(0, prev - 1));
          setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
          const errorMsg = response.errors?.[0]?.message || response.message || 'Failed to decline connection request';
          showToast(errorMsg, 'error');
          throw new Error(errorMsg);
        }
      }
    } catch (err) {
      console.error('Error handling notification action:', err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An error occurred. Please try again.');
    }
  };

  const handleBusinessInvitationAction = async (invitationId: string, action: 'accept' | 'decline'): Promise<void> => {
    // Find the invitation to get profileId
    const invitation = businessInvitations.find(inv => inv.invitationId === invitationId);
    if (!invitation) {
      showToast('Invitation not found', 'error');
      throw new Error('Invitation not found');
    }

    try {
      let response;
      if (action === 'accept') {
        response = await businessProfileApi.acceptInvitation(invitation.profileId, invitationId);
        if (response.success) {
          showToast(response.message || 'Invitation accepted!', 'success');
          await new Promise(resolve => setTimeout(resolve, 1000));
          setBusinessInvitations(prev => prev.filter(inv => inv.invitationId !== invitationId));
          setBusinessPendingCount(prev => Math.max(0, prev - 1));
        } else {
          const errorMsg = response.message || 'Failed to accept invitation';
          showToast(errorMsg, 'error');
          throw new Error(errorMsg);
        }
      } else {
        response = await businessProfileApi.declineInvitation(invitation.profileId, invitationId);
        if (response.success) {
          showToast(response.message || 'Invitation declined', 'info');
          await new Promise(resolve => setTimeout(resolve, 1000));
          setBusinessInvitations(prev => prev.filter(inv => inv.invitationId !== invitationId));
          setBusinessPendingCount(prev => Math.max(0, prev - 1));
        } else {
          const errorMsg = response.message || 'Failed to decline invitation';
          showToast(errorMsg, 'error');
          throw new Error(errorMsg);
        }
      }
    } catch (err) {
      console.error('Error handling business invitation action:', err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An error occurred. Please try again.');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);
  const pendingBusinessInvitations = businessInvitations.filter(inv => inv.status === 'pending');
  const acceptedBusinessInvitations = businessInvitations.filter(inv => inv.status === 'accepted');
  const declinedBusinessInvitations = businessInvitations.filter(inv => inv.status === 'declined');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-100 dark:bg-neutral-950 font-sans transition-colors">
      <header className="py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleGoBack} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {activeTab === 'connections' ? (
                <>
                  {unreadCount > 0 && `${unreadCount} unread · `}
                  {pendingCount > 0 && `${pendingCount} pending`}
                </>
              ) : (
                <>
                  {businessPendingCount > 0 && `${businessPendingCount} pending`}
                  {acceptedBusinessInvitations.length > 0 && ` · ${acceptedBusinessInvitations.length} accepted`}
                  {declinedBusinessInvitations.length > 0 && ` · ${declinedBusinessInvitations.length} declined`}
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-neutral-200 dark:border-neutral-800">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('connections')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'connections'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Connection Requests
                  {pendingCount > 0 && (
                    <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('business')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'business'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Business Invitations
                  {businessPendingCount > 0 && (
                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                      {businessPendingCount}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>
        </div>
        {/* Loading State */}
        {loading && (
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="!p-0 overflow-hidden">
            <div className="text-center py-20 px-6">
              <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                Failed to load notifications
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {error}
              </p>
              <Button 
                onClick={fetchNotifications} 
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Notifications List */}
        {!loading && !error && (
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Card className="!p-0 overflow-hidden">
              {notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center py-20 px-6"
                >
                  <Bell size={48} className="text-neutral-400 dark:text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                    No notifications
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    You don&apos;t have any notifications yet.
                  </p>
                </motion.div>
              ) : (
                <>
                  {unreadNotifications.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-neutral-500 px-4 pt-4 pb-1 uppercase tracking-wider">
                        New ({unreadNotifications.length})
                      </h3>
                      <AnimatePresence initial={false}>
                        {unreadNotifications.map(notification => (
                          <NotificationItem
                            key={notification.notification_id}
                            notification={notification}
                            onAction={handleNotificationAction}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {readNotifications.length > 0 && (
                    <div className={unreadNotifications.length > 0 ? 'mt-2' : ''}>
                      <h3 className="text-xs font-semibold text-neutral-500 px-4 pt-4 pb-1 uppercase tracking-wider">
                        Earlier ({readNotifications.length})
                      </h3>
                      <AnimatePresence initial={false}>
                        {readNotifications.map(notification => (
                          <NotificationItem
                            key={notification.notification_id}
                            notification={notification}
                            onAction={handleNotificationAction}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}

        {/* Business Invitations Tab */}
        {activeTab === 'business' && (
          <>
            {/* Loading State */}
            {businessLoading && (
              <Card className="!p-0 overflow-hidden">
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              </Card>
            )}

            {/* Error State */}
            {businessError && !businessLoading && (
              <Card className="!p-0 overflow-hidden">
                <div className="text-center py-20 px-6">
                  <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                    Failed to load business invitations
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {businessError}
                  </p>
                  <Button 
                    onClick={fetchBusinessInvitations} 
                    className="mt-4"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              </Card>
            )}

            {/* Business Invitations List */}
            {!businessLoading && !businessError && (
              <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                <Card className="!p-0 overflow-hidden">
                  {businessInvitations.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-center py-20 px-6"
                    >
                      <Building2 size={48} className="text-neutral-400 dark:text-neutral-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                        No business invitations
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        You don&apos;t have any business profile invitations yet.
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      {pendingBusinessInvitations.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-neutral-500 px-4 pt-4 pb-1 uppercase tracking-wider">
                            Pending ({pendingBusinessInvitations.length})
                          </h3>
                          <AnimatePresence initial={false}>
                            {pendingBusinessInvitations.map(invitation => (
                              <BusinessInvitationItem
                                key={invitation.invitationId}
                                invitation={invitation}
                                onAction={handleBusinessInvitationAction}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}

                      {acceptedBusinessInvitations.length > 0 && (
                        <div className={pendingBusinessInvitations.length > 0 ? 'mt-2' : ''}>
                          <h3 className="text-xs font-semibold text-neutral-500 px-4 pt-4 pb-1 uppercase tracking-wider">
                            Accepted ({acceptedBusinessInvitations.length})
                          </h3>
                          <AnimatePresence initial={false}>
                            {acceptedBusinessInvitations.map(invitation => (
                              <BusinessInvitationItem
                                key={invitation.invitationId}
                                invitation={invitation}
                                onAction={handleBusinessInvitationAction}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}

                      {declinedBusinessInvitations.length > 0 && (
                        <div className={pendingBusinessInvitations.length > 0 || acceptedBusinessInvitations.length > 0 ? 'mt-2' : ''}>
                          <h3 className="text-xs font-semibold text-neutral-500 px-4 pt-4 pb-1 uppercase tracking-wider">
                            Declined ({declinedBusinessInvitations.length})
                          </h3>
                          <AnimatePresence initial={false}>
                            {declinedBusinessInvitations.map(invitation => (
                              <BusinessInvitationItem
                                key={invitation.invitationId}
                                invitation={invitation}
                                onAction={handleBusinessInvitationAction}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        position="top"
      />
    </div>
  );
};

export default NotificationsPage;