'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Check, Search, Loader2, MessageCircle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAppSelector } from '@/store/hooks';
import { env } from '@/lib/env';
import { tokenStorage } from '@/lib/tokens';
import { 
  getConnectionsList, 
  type ConnectionData,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  withdrawConnectionRequest,
  getSentRequests,
  type SentRequestData,
  sendConnectionRequest,
  getSuggestedUsers,
  type SuggestedUser,
} from '@/lib/api/connections';
import { 
  getNotifications, 
  type NotificationItem 
} from '@/lib/api/notifications';

// --- TYPES ---
interface GlobalSearchUser {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  headline?: string;
  location?: string;
}

// --- AVATAR COMPONENT ---
const Avatar = ({ name, imageUrl, className = '' }: { name: string; imageUrl?: string; className?: string }) => {
  const safeName = name || 'User';
  const fallback = safeName
    .split(' ')
    .filter(n => n.trim().length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className={`relative rounded-full flex items-center justify-center overflow-hidden shrink-0 ${className || 'w-10 h-10'}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={safeName} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
          <span className="text-white font-semibold text-sm">{fallback}</span>
        </div>
      )}
    </div>
  );
};

// --- INVITATION ITEM ---
const InvitationItem = ({
  invitation,
  onAction,
  onViewProfile
}: {
  invitation: NotificationItem;
  onAction: (notificationId: string, action: 'accept' | 'reject') => Promise<void>;
  onViewProfile: (userId: string) => void;
}) => {
  const [actionState, setActionState] = useState<'accepting' | 'rejecting' | 'accepted' | 'rejected' | null>(null);
  
  const itemVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } }
  };

  const handleAction = async (actionType: 'accept' | 'reject') => {
    setActionState(actionType === 'accept' ? 'accepting' : 'rejecting');
    try {
      await onAction(invitation.notification_id, actionType);
      setActionState(actionType === 'accept' ? 'accepted' : 'rejected');
      setTimeout(() => {
        // Component will be removed by parent
      }, 1500);
    } catch (error) {
      console.error('Action failed:', error);
      setActionState(null);
    }
  };

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center justify-between gap-4 p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0"
    >
      <div 
        className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onViewProfile(invitation.sender_id)}
      >
        <Avatar 
          name={invitation.sender_details?.name || 'Unknown'} 
          imageUrl={undefined}
          className="w-11 h-11" 
        />
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-white truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            {invitation.sender_details?.name || 'Unknown User'}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            {invitation.sender_details?.email || 'No info available'}
          </p>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {!actionState || actionState === 'accepting' || actionState === 'rejecting' ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-2 shrink-0"
          >
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleAction('reject')}
              disabled={!!actionState}
            >
              {actionState === 'rejecting' ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Rejecting...</>
              ) : (
                'Ignore'
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => handleAction('accept')}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!!actionState}
            >
              {actionState === 'accepting' ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Accepting...</>
              ) : (
                'Accept'
              )}
            </Button>
          </motion.div>
        ) : actionState === 'accepted' ? (
          <motion.p
            key="accepted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1 text-xs"
          >
            <Check size={14} /> Accepted!
          </motion.p>
        ) : (
          <motion.p
            key="rejected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-neutral-500 font-semibold flex items-center gap-1 text-xs"
          >
            <X size={14} /> Ignored
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- CONNECTION ITEM ---
const ConnectionItem = ({
  connection,
  onViewProfile,
  onRemove
}: {
  connection: ConnectionData;
  onViewProfile: (userId: string) => void;
  onRemove: (userId: string, userName: string) => void;
}) => {
  const router = useRouter();
  const connectedSince = new Date(connection.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the view profile click
    onRemove(connection.connected_user.id, connection.connected_user.name);
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/chat/new?userId=${connection.connected_user.id}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, x: 50, transition: { duration: 0.3 } }}
      className="flex items-center justify-between gap-4 p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
    >
      <div 
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        onClick={() => onViewProfile(connection.connected_user.id)}
      >
        <Avatar 
          name={connection.connected_user.name} 
          imageUrl={connection.connected_user.profile_pic}
          className="w-11 h-11" 
        />
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-white truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            {connection.connected_user.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            {connection.connected_user.designation || connection.connected_user.company || connection.connected_user.email}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
            Connected since {connectedSince}
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleMessageClick}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Message
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleRemoveClick}
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          Remove
        </Button>
      </div>
    </motion.div>
  );
};

// --- SENT REQUEST ITEM ---
const SentRequestItem = ({
  request,
  onWithdraw,
  onViewProfile
}: {
  request: SentRequestData;
  onWithdraw: (notificationId: string, recipientId: string) => Promise<void>;
  onViewProfile: (userId: string) => void;
}) => {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);

  const sentDate = new Date(request.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleWithdraw = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWithdrawing(true);
    try {
      await onWithdraw(request.notification_id, request.recipient_id);
      setWithdrawn(true);
    } catch (error) {
      console.error('Withdraw failed:', error);
      setIsWithdrawing(false);
    }
  };

  const itemVariants = {
    initial: { opacity: 1 },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } }
  };

  // Build recipient name from the new API response format
  const recipientName = request.recipient_first_name && request.recipient_last_name
    ? `${request.recipient_first_name} ${request.recipient_last_name}`
    : request.recipient_first_name || 'Unknown User';

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="initial"
      exit="exit"
      className="flex items-center justify-between gap-4 p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
    >
      <div 
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        onClick={() => onViewProfile(request.recipient_id)}
      >
        <Avatar 
          name={recipientName} 
          imageUrl={request.recipient_profile_pic}
          className="w-11 h-11" 
        />
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-white truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            {recipientName}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            {request.recipient_email || 'No email available'}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
            Sent on {sentDate}
          </p>
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        {withdrawn ? (
          <motion.p
            key="withdrawn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-neutral-500 font-semibold flex items-center gap-1 text-xs shrink-0"
          >
            <Check size={14} /> Withdrawn
          </motion.p>
        ) : (
          <Button 
            key="withdraw-button"
            variant="ghost" 
            size="sm"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 shrink-0"
          >
            {isWithdrawing ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1" />
                Withdrawing...
              </>
            ) : (
              'Withdraw'
            )}
          </Button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- RECOMMENDATION ITEM ---
const RecommendationItem = ({
  recommendation,
  onConnect,
  onViewProfile,
  status,
}: {
  recommendation: SuggestedUser;
  onConnect: (userId: string, userName: string) => Promise<void>;
  onViewProfile: (userId: string) => void;
  status: 'idle' | 'sending' | 'sent';
}) => {
  const displayName = recommendation.name || 'Unknown User';
  const headline = recommendation.headline || recommendation.company_name;

  return (
    <Card className="h-full flex flex-col border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 backdrop-blur-lg shadow-sm">
      <div
        className="flex flex-col items-center text-center gap-4 p-6 cursor-pointer"
        onClick={() => recommendation.user_id && onViewProfile(recommendation.user_id)}
      >
        <motion.div
          layout
          className="flex items-center justify-center w-16 h-16"
        >
          <Avatar
            name={displayName}
            imageUrl={recommendation.profile_pic || undefined}
            className="w-16 h-16 rounded-full overflow-hidden"
          />
        </motion.div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-neutral-900 dark:text-white truncate">
            {displayName}
          </p>
          {headline && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[180px] mx-auto">
              {headline}
            </p>
          )}
          {!headline && recommendation.email && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[180px] mx-auto">
              {recommendation.email}
            </p>
          )}
        </div>
      </div>
      <div className="px-6 pb-6 mt-auto">
        <Button
          variant={status === 'sent' ? 'outline' : 'default'}
          size="sm"
          className={
            status === 'sent'
              ? 'w-full bg-transparent text-neutral-500 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700'
              : 'w-full bg-purple-600 hover:bg-purple-700'
          }
          onClick={() => recommendation.user_id && onConnect(recommendation.user_id, displayName)}
          disabled={status !== 'idle'}
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending...
            </>
          ) : status === 'sent' ? (
            'Request Sent'
          ) : (
            'Connect'
          )}
        </Button>
      </div>
    </Card>
  );
};

// --- CONNECTIONS PAGE ---
const ConnectionsPage = () => {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'invitations' | 'connections' | 'sent'>('connections');
  
  // Data states
  const [invitations, setInvitations] = useState<NotificationItem[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequestData[]>([]);
  const [recommendations, setRecommendations] = useState<SuggestedUser[]>([]);
  
  // Loading and pagination states
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [recommendationStatuses, setRecommendationStatuses] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});
  const connectionsRef = useRef<ConnectionData[]>([]);
  
  // Global search state (when no connections found)
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchUser[]>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  
  // Remove connection state
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Fetch invitations (connection requests) - ONLY PENDING
  const fetchInvitations = async () => {
    try {
      console.log('📥 Fetching pending connection requests...');
      
      const response = await getNotifications({
        page: 1,
        limit: 100, // Fetch more to ensure we get all pending
        type: 'connect_request',
        status: 'pending' // Only fetch pending requests from backend
      });

      if (response.success && response.data) {
        // Double-check: Filter only pending requests (in case backend returns others)
        const pendingInvites = response.data.notifications.filter(
          notif => notif.connect_request === 'pending'
        );
        
        console.log('✅ Pending invitations loaded:', {
          total: response.data.notifications.length,
          pending: pendingInvites.length,
          filtered_out: response.data.notifications.length - pendingInvites.length
        });
        
        setInvitations(pendingInvites);
      } else {
        console.warn('⚠️ Failed to fetch invitations:', response.message);
        setInvitations([]);
      }
    } catch (error) {
      console.error('❌ Error fetching invitations:', error);
      setInvitations([]);
    }
  };

  // Global user search (when no connections found)
  const searchGlobalUsers = async (query: string) => {
    if (!query.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    
    setIsGlobalSearching(true);
    try {
      const tokens = tokenStorage.getStoredTokens();
      if (!tokens?.access_token) {
        console.error('No auth token available for global search');
        setGlobalSearchResults([]);
        return;
      }

      const url = `${env.API_URL}/profile/search?q=${encodeURIComponent(query)}&limit=20&offset=0`;
      console.log('[Connections] Global search:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Connections] Global search results:', data);
        
        if (data.success && data.data?.results) {
          // Filter out current user, already connected users, and users with sent requests
          const existingConnections = connections.map(c => c.connected_user.id);
          const sentRequestUserIds = sentRequests.map(r => r.recipient_id);
          
          const filtered = data.data.results.filter((u: GlobalSearchUser) => 
            u.user_id !== user?.id && 
            !existingConnections.includes(u.user_id) &&
            !sentRequestUserIds.includes(u.user_id)
          );
          
          console.log('[Connections] Filtered global results:', filtered.length);
          setGlobalSearchResults(filtered);
        } else {
          setGlobalSearchResults([]);
        }
      } else {
        console.error('[Connections] Global search failed:', response.status);
        setGlobalSearchResults([]);
      }
    } catch (error) {
      console.error('[Connections] Global search error:', error);
      setGlobalSearchResults([]);
    } finally {
      setIsGlobalSearching(false);
    }
  };
  
  // Fetch connections list
  const fetchConnections = async (page = 1, search = ''): Promise<ConnectionData[]> => {
    let fetchedConnections: ConnectionData[] = [];
    try {
      setLoading(true);
      const response = await getConnectionsList({
        page,
        limit: 20,
        search: search || undefined,
        status: 'active'
      });

      if (response.success && response.data) {
        setConnections(response.data.connections);
        fetchedConnections = response.data.connections;
        setTotal(response.data.total);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.total_pages);
        
        // If no connections found and search query exists, try global search
        if (response.data.connections.length === 0 && search) {
          await searchGlobalUsers(search);
        } else {
          setGlobalSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
    return fetchedConnections;
  };

  // Fetch sent requests
  const fetchSentRequests = async (page = 1, search = '') => {
    try {
      setLoading(true);
      console.log('📤 Fetching sent connection requests...');
      
      const response = await getSentRequests({
        recipient: search || undefined
      });

      if (response.success && response.data) {
        console.log('✅ Sent requests loaded:', {
          total: response.data.length,
          requests: response.data.length
        });
        
        // Filter only pending requests
        let filteredRequests = response.data.filter(req => 
          req.payload?.connect_request === 'pending'
        );
        
        // Apply search filter if provided (search in name or email)
        if (search) {
          filteredRequests = filteredRequests.filter(req => {
            const name = `${req.recipient_first_name || ''} ${req.recipient_last_name || ''}`.toLowerCase();
            const email = (req.recipient_email || '').toLowerCase();
            const searchLower = search.toLowerCase();
            return name.includes(searchLower) || email.includes(searchLower);
          });
        }
        
        setSentRequests(filteredRequests);
        setTotal(filteredRequests.length);
        setCurrentPage(1);
        setTotalPages(1);
      } else {
        console.warn('⚠️ Failed to fetch sent requests:', response.message);
        setSentRequests([]);
      }
    } catch (error) {
      console.error('❌ Error fetching sent requests:', error);
      setSentRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const fetchRecommendations = useCallback(async (limit = 8, currentConnections?: ConnectionData[]) => {
    try {
      setRecommendationsLoading(true);
      setRecommendationsError(null);

      const response = await getSuggestedUsers(1, limit);

      if (response.success && response.data) {
        const raw = response.data.users || [];

        const latestConnections = currentConnections ?? connectionsRef.current;
        const existingConnections = latestConnections.map((conn) => conn.connected_user.id);
        const existingSet = new Set(existingConnections);
        
        // Also filter out users we've already sent connection requests to
        const sentRequestUserIds = sentRequests.map((req) => req.recipient_id);
        const sentRequestsSet = new Set(sentRequestUserIds);

        const filtered = raw.filter((rec) => {
          // Filter out incomplete profiles
          if (!rec.user_id) return false;
          if (!rec.name || rec.name.trim() === '') return false;
          if (!rec.email || rec.email.trim() === '') return false;
          
          if (rec.user_id === user?.id) return false;
          // Exclude if already connected
          if (existingSet.has(rec.user_id)) return false;
          // Exclude if we've already sent them a connection request
          if (sentRequestsSet.has(rec.user_id)) return false;
          return true;
        });

        setRecommendations(filtered);
        setRecommendationStatuses((prev) => {
          const next: Record<string, 'idle' | 'sending' | 'sent'> = {};
          filtered.forEach((rec) => {
            next[rec.user_id] = prev[rec.user_id] === 'sent' ? 'sent' : 'idle';
          });
          return next;
        });
      } else {
        const message = response.message || 'Unable to load suggestions';
        setRecommendations([]);
        setRecommendationStatuses({});
        setRecommendationsError(message);
        console.warn('⚠️ Suggested users fetch failed:', message);
      }
    } catch (error) {
      console.error('❌ Error fetching suggested users:', error);
      setRecommendations([]);
      setRecommendationStatuses({});
      setRecommendationsError(error instanceof Error ? error.message : 'Failed to load suggestions');
    } finally {
      setRecommendationsLoading(false);
    }
  }, [user?.id, sentRequests]);

  useEffect(() => {
    if (recommendations.length === 0) {
      return;
    }

    setRecommendations((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const existingSet = new Set(connections.map((conn) => conn.connected_user.id));
      const sentRequestsSet = new Set(sentRequests.map((req) => req.recipient_id));
      
      const filtered = prev.filter((rec) => 
        !existingSet.has(rec.user_id) && !sentRequestsSet.has(rec.user_id)
      );

      if (filtered.length === prev.length) {
        return prev;
      }

      setRecommendationStatuses((prevStatuses) => {
        const next: Record<string, 'idle' | 'sending' | 'sent'> = {};
        filtered.forEach((rec) => {
          next[rec.user_id] = prevStatuses[rec.user_id] ?? 'idle';
        });
        return next;
      });

      return filtered;
    });
  }, [connections, recommendations, sentRequests]);

  // Initial load based on active tab
  useEffect(() => {
    fetchInvitations();
    
    if (activeTab === 'connections') {
      (async () => {
        const latestConnections = await fetchConnections();
        await fetchRecommendations(8, latestConnections);
      })();
    } else if (activeTab === 'sent') {
      fetchSentRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Only re-run when activeTab changes

  // Socket event listeners for real-time updates
  useEffect(() => {
    const handleConnectionRequest = () => {
      console.log('🔔 Real-time: New connection request received');
      fetchInvitations(); // Refresh invitations list
    };

    const handleConnectionAccepted = () => {
      console.log('🔔 Real-time: Connection accepted');
      fetchConnections(currentPage, searchQuery); // Refresh connections list
      fetchInvitations(); // Refresh invitations (remove accepted one)
    };

    const handleConnectionRejected = () => {
      console.log('🔔 Real-time: Connection rejected');
      fetchInvitations(); // Refresh invitations (remove rejected one)
    };

    // Listen for socket events dispatched by SocketNotificationsWrapper
    window.addEventListener('connection:request:received', handleConnectionRequest);
    window.addEventListener('connection:accepted', handleConnectionAccepted);
    window.addEventListener('connection:rejected', handleConnectionRejected);

    return () => {
      window.removeEventListener('connection:request:received', handleConnectionRequest);
      window.removeEventListener('connection:accepted', handleConnectionAccepted);
      window.removeEventListener('connection:rejected', handleConnectionRejected);
    };
  }, [currentPage, searchQuery]);

  // Handle search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery !== undefined) {
        if (activeTab === 'connections') {
          fetchConnections(1, searchQuery);
        } else if (activeTab === 'sent') {
          fetchSentRequests(1, searchQuery);
        }
        
        // Also trigger global search to find users not in connections
        if (searchQuery.trim()) {
          searchGlobalUsers(searchQuery);
        } else {
          setGlobalSearchResults([]);
        }
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchQuery, activeTab]);

  // Handle invitation action
  const handleInvitationAction = async (notificationId: string, action: 'accept' | 'reject') => {
    const invitation = invitations.find(inv => inv.notification_id === notificationId);
    if (!invitation) {
      console.warn('⚠️ Invitation not found:', notificationId);
      return;
    }

    console.log(`${action === 'accept' ? '✅' : '❌'} ${action === 'accept' ? 'Accepting' : 'Rejecting'} connection request:`, {
      notificationId,
      from: invitation.sender_id,
      status: invitation.connect_request
    });

    try {
      if (action === 'accept') {
        const response = await acceptConnectionRequest(invitation.sender_id);
        if (response.success) {
          console.log('✅ Connection accepted successfully');
          // Remove from invitations after delay to show success state
          setTimeout(() => {
            setInvitations(prev => {
              const updated = prev.filter(inv => inv.notification_id !== notificationId);
              console.log('📤 Removed accepted invitation. Remaining pending:', updated.length);
              return updated;
            });
            // Refresh connections list to show new connection
            fetchConnections(currentPage, searchQuery);
          }, 1500);
        } else {
          console.error('❌ Failed to accept:', response.message);
        }
      } else {
        const response = await rejectConnectionRequest(invitation.sender_id);
        if (response.success) {
          console.log('✅ Connection rejected successfully');
          // Remove from invitations after delay to show rejected state
          setTimeout(() => {
            setInvitations(prev => {
              const updated = prev.filter(inv => inv.notification_id !== notificationId);
              console.log('📤 Removed rejected invitation. Remaining pending:', updated.length);
              return updated;
            });
          }, 1500);
        } else {
          console.error('❌ Failed to reject:', response.message);
        }
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing connection:`, error);
      throw error;
    }
  };

  // Handle withdraw sent request
  const handleWithdrawRequest = async (notificationId: string, recipientId: string) => {
    try {
      console.log('🔙 Withdrawing connection request:', { notificationId, recipientId });
      
      const response = await withdrawConnectionRequest(recipientId);

      if (response.success) {
        console.log('✅ Connection request withdrawn successfully');
        
        // Remove from sent requests after brief delay
        setTimeout(() => {
          setSentRequests(prev => {
            const updated = prev.filter(req => req.notification_id !== notificationId);
            console.log('📤 Removed withdrawn request. Remaining:', updated.length);
            return updated;
          });
          setTotal(prev => prev - 1);
        }, 1500);
      } else {
        console.error('❌ Failed to withdraw:', response.message);
        alert(response.message || 'Failed to withdraw connection request');
      }
    } catch (error) {
      console.error('❌ Error withdrawing connection request:', error);
      throw error;
    }
  };

  const handleConnectRecommendation = async (userId: string, userName: string) => {
    if (!userId) return;

    setRecommendationStatuses((prev) => ({
      ...prev,
      [userId]: 'sending',
    }));

    try {
      const response = await sendConnectionRequest(userId);

      if (response.success) {
        setRecommendationStatuses((prev) => ({
          ...prev,
          [userId]: 'sent',
        }));
        toast.success('Connection request sent', {
          description: `We let ${userName} know you'd like to connect`,
        });
        // Also refresh invitations to reflect pending state for recipient
        fetchInvitations();
      } else {
        setRecommendationStatuses((prev) => ({
          ...prev,
          [userId]: 'idle',
        }));
        toast.error(response.message || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('❌ Error sending connection request:', error);
      setRecommendationStatuses((prev) => ({
        ...prev,
        [userId]: 'idle',
      }));
      toast.error('Failed to send connection request. Please try again.');
    }
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      if (activeTab === 'connections') {
        fetchConnections(newPage, searchQuery);
      } else if (activeTab === 'sent') {
        fetchSentRequests(newPage, searchQuery);
      }
    }
  };

  // Handle remove connection
  const handleRemoveConnection = (userId: string, userName: string) => {
    setUserToRemove({ id: userId, name: userName });
    setShowRemoveConfirm(true);
  };

  const confirmRemoveConnection = async () => {
    if (!userToRemove) return;

    setIsRemoving(true);
    try {
      console.log('🔌 Removing connection with user:', userToRemove.id);
      const response = await removeConnection(userToRemove.id);

      if (response.success) {
        console.log('✅ Connection removed successfully');
        
        // Remove from connections list immediately
        setConnections(prev => prev.filter(conn => conn.connected_user.id !== userToRemove.id));
        setTotal(prev => prev - 1);
        
        // Close dialog
        setShowRemoveConfirm(false);
        setUserToRemove(null);
        
        // Refresh connections list to get updated count
        setTimeout(() => {
          fetchConnections(currentPage, searchQuery);
        }, 500);
      } else {
        console.error('❌ Failed to remove connection:', response.message);
        alert(response.message || 'Failed to remove connection');
      }
    } catch (error) {
      console.error('❌ Error removing connection:', error);
      alert('Failed to remove connection');
    } finally {
      setIsRemoving(false);
    }
  };

  const cancelRemoveConnection = () => {
    setShowRemoveConfirm(false);
    setUserToRemove(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-100 dark:bg-neutral-950 font-sans transition-colors">
      <header className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={handleGoBack} className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Manage Connections
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {activeTab === 'connections' && `${total} connections`}
                {activeTab === 'invitations' && `${invitations.length} pending invitations`}
                {activeTab === 'sent' && `${total} sent requests`}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                activeTab === 'connections'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Connections
              {activeTab === 'connections' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                activeTab === 'invitations'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Invitations
              {invitations.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                  {invitations.length}
                </span>
              )}
              {activeTab === 'invitations' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                activeTab === 'sent'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Sent Requests
              {activeTab === 'sent' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                />
              )}
            </button>
          </div>

          {/* Search Bar - Only show for connections and sent requests */}
          {(activeTab === 'connections' || activeTab === 'sent') && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder={activeTab === 'connections' ? "Search connections..." : "Search sent requests..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-6"
        >
          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <Card className="!p-0 overflow-hidden">
              <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Pending Invitations ({invitations.length})
                </h2>
              </div>
              {invitations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No pending invitations
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {invitations.map(invitation => (
                    <InvitationItem
                      key={invitation.notification_id}
                      invitation={invitation}
                      onAction={handleInvitationAction}
                      onViewProfile={handleViewProfile}
                    />
                  ))}
                </AnimatePresence>
              )}
            </Card>
          )}

          {/* Connections Tab */}
          {activeTab === 'connections' && (
            <Card className="!p-0 overflow-hidden">
              <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Your Connections ({total})
                </h2>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
              ) : connections.length === 0 ? (
                <>
                  <div className="text-center py-8 px-6">
                    <Users className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {searchQuery ? 'No connections found' : 'No connections yet'}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {searchQuery ? `No connections match "${searchQuery}"` : 'Start connecting with people'}
                    </p>
                  </div>
                  
                  {/* Global search results section */}
                  {searchQuery && globalSearchResults.length > 0 && (
                    <>
                      <div className="border-t border-neutral-200 dark:border-neutral-800">
                        <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-900/50">
                          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            People you may know ({globalSearchResults.length})
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Connect with these users to grow your network
                          </p>
                        </div>
                      </div>
                      <div className="px-6 pb-6 space-y-2">
                        {globalSearchResults.map((user: GlobalSearchUser) => (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between gap-4 p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                        >
                          <div 
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                            onClick={() => handleViewProfile(user.user_id)}
                          >
                            <Avatar name={`${user.first_name} ${user.last_name}`} imageUrl={user.avatar_url} className="w-11 h-11" />
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-900 dark:text-white truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                {user.headline || user.location || 'User'}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleConnectRecommendation(user.user_id, `${user.first_name} ${user.last_name}`)}
                            disabled={recommendationStatuses[user.user_id] === 'sending' || recommendationStatuses[user.user_id] === 'sent'}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {recommendationStatuses[user.user_id] === 'sending' ? (
                              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending...</>
                            ) : recommendationStatuses[user.user_id] === 'sent' ? (
                              'Request Sent'
                            ) : (
                              'Connect'
                            )}
                          </Button>
                        </div>
                      ))}
                      </div>
                    </>
                  )}
                  
                  {searchQuery && isGlobalSearching && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                      <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">Searching all users...</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(() => {
                    // Filter connections based on search query
                    const filteredConnections = connections.filter(connection => {
                      if (!searchQuery) return true;
                      
                      const searchLower = searchQuery.toLowerCase();
                      const userName = connection.connected_user.name?.toLowerCase() || '';
                      const userEmail = connection.connected_user.email?.toLowerCase() || '';
                      const userDesignation = connection.connected_user.designation?.toLowerCase() || '';
                      const userCompany = connection.connected_user.company?.toLowerCase() || '';
                      
                      return userName.includes(searchLower) || 
                             userEmail.includes(searchLower) || 
                             userDesignation.includes(searchLower) ||
                             userCompany.includes(searchLower);
                    });

                    // Trigger global search if filtered list is empty and we have a search query
                    if (searchQuery && filteredConnections.length === 0 && !isGlobalSearching && globalSearchResults.length === 0) {
                      searchGlobalUsers(searchQuery);
                    }

                    return (
                      <>
                        {filteredConnections.length > 0 ? (
                          <div>
                            <AnimatePresence initial={false}>
                              {filteredConnections.map(connection => (
                                <ConnectionItem
                                  key={connection.connection_id}
                                  connection={connection}
                                  onViewProfile={handleViewProfile}
                                  onRemove={handleRemoveConnection}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        ) : searchQuery ? (
                          <div className="text-center py-8 px-6">
                            <Users className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              No connections found
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              No connections match &quot;{searchQuery}&quot;
                            </p>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}

                  {/* Global search results - show when searching and results found */}
                  {searchQuery && globalSearchResults.length > 0 && (
                    <>
                      <div className="border-t-2 border-purple-200 dark:border-purple-900/50 my-4"></div>
                      <div className="px-6 py-3 bg-purple-50 dark:bg-purple-900/20">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                          Other users matching &quot;{searchQuery}&quot; ({globalSearchResults.length})
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                          Not in your connections - click Connect to send request
                        </p>
                      </div>
                      <div className="px-6 pb-4 space-y-2">
                        {globalSearchResults.map((user: GlobalSearchUser) => (
                          <div
                            key={user.user_id}
                            className="flex items-center justify-between gap-4 p-4 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors rounded-lg"
                          >
                            <div 
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                              onClick={() => handleViewProfile(user.user_id)}
                            >
                              <Avatar name={`${user.first_name} ${user.last_name}`} imageUrl={user.avatar_url} className="w-11 h-11" />
                              <div className="min-w-0">
                                <p className="font-semibold text-neutral-900 dark:text-white truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                  {user.headline || user.location || 'User'}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleConnectRecommendation(user.user_id, `${user.first_name} ${user.last_name}`)}
                              disabled={recommendationStatuses[user.user_id] === 'sending' || recommendationStatuses[user.user_id] === 'sent'}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              {recommendationStatuses[user.user_id] === 'sending' ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending...</>
                              ) : recommendationStatuses[user.user_id] === 'sent' ? (
                                'Request Sent'
                              ) : (
                                'Connect'
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {activeTab === 'connections' && (connections.length === 0 && searchQuery || connections.length > 0) && (
            <Card className="!p-0 overflow-hidden">
              <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {connections.length === 0 && searchQuery ? 'Try connecting with these people' : 'People you may know'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                  onClick={() => fetchRecommendations(8, connections)}
                  disabled={recommendationsLoading}
                >
                  {recommendationsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Refreshing
                    </>
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>

              {recommendationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
              ) : recommendationsError ? (
                <div className="text-center py-10 px-4">
                  <p className="text-neutral-500 dark:text-neutral-400 mb-3">
                    {recommendationsError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchRecommendations(8, connections)}
                  >
                    Try again
                  </Button>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-neutral-500 dark:text-neutral-400">
                    We’ll show new members here once we spot profiles that match your interests.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6 pb-6"
                  >
                    {recommendations.map((recommendation, index) => (
                      <motion.div
                        key={recommendation.user_id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ delay: index * 0.05, type: 'spring', stiffness: 120, damping: 14 }}
                      >
                        <RecommendationItem
                          recommendation={recommendation}
                          onConnect={handleConnectRecommendation}
                          onViewProfile={handleViewProfile}
                          status={recommendationStatuses[recommendation.user_id] ?? 'idle'}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </Card>
          )}

          {/* Sent Requests Tab */}
          {activeTab === 'sent' && (
            <Card className="!p-0 overflow-hidden">
              <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Sent Connection Requests ({total})
                </h2>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
              ) : sentRequests.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-neutral-500 dark:text-neutral-400">
                    {searchQuery ? 'No sent requests found matching your search' : 'No sent requests'}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <AnimatePresence initial={false}>
                      {sentRequests.map(request => (
                        <SentRequestItem
                          key={request.notification_id}
                          request={request}
                          onWithdraw={handleWithdrawRequest}
                          onViewProfile={handleViewProfile}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}
        </motion.div>
      </main>

      {/* Remove Connection Confirmation Dialog */}
      <AnimatePresence>
        {showRemoveConfirm && userToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={cancelRemoveConnection}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Remove Connection
                </h3>
                <button
                  onClick={cancelRemoveConnection}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  disabled={isRemoving}
                >
                  <X className="h-5 w-5 text-neutral-500" />
                </button>
              </div>
              
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Are you sure you want to remove <span className="font-semibold text-neutral-900 dark:text-white">{userToRemove.name}</span> from your connections?
              </p>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={cancelRemoveConnection}
                  disabled={isRemoving}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmRemoveConnection}
                  disabled={isRemoving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Removing...
                    </>
                  ) : (
                    'Remove Connection'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectionsPage;
