"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  UserX,
  Shield,
  AlertCircle,
  CheckCircle,
  Search,
  MoreVertical,
  Edit,
  X,
  Loader2,
  Send,
  Clock,
  XCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { businessProfileApi } from "@/lib/api";
import type { BusinessProfile } from "@/types/auth";

// Import Member type from API
interface Member {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  joinedAt: string;
  lastActive: string | null;
}

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor';
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  lastActive?: string;
  avatar?: string;
  isActive: boolean;
}

interface SentInvitation {
  invitationId: string;
  inviteeId: string;
  inviteeEmail: string;
  inviteeName: string;
  inviteeAvatar: string | null;
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
}

interface SearchUser {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface UserManagementTabProps {
  businessProfile: BusinessProfile;
}

export function UserManagementTab({ businessProfile }: UserManagementTabProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Search functionality
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'editor'>('editor');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  
  // Member summary and pagination
  const [memberSummary, setMemberSummary] = useState<{
    totalMembers: number;
    admins: number;
    editors: number;
    activeMembers: number;
  } | null>(null);
  const [invitationSummary, setInvitationSummary] = useState<{
    pending: number;
    accepted: number;
    declined: number;
    cancelled: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [invitationsHasNextPage, setInvitationsHasNextPage] = useState(false);
  
  // Member role management state
  const [promoteDemoteLoading, setPromoteDemoteLoading] = useState<string | null>(null);
  const [roleChangeSuccess, setRoleChangeSuccess] = useState<string | null>(null);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);
  
  // Remove member state
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  
  // Cancel invitation state
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  // Fetch sent invitations from API
  useEffect(() => {
    const fetchSentInvitations = async () => {
      if (activeTab !== 'invitations') return;
      
      try {
        setInvitationsLoading(true);
        const profileId = businessProfile.profileId;
        
        if (!profileId) {
          console.error('Business profile ID not found');
          setInvitationsLoading(false);
          return;
        }

        const response = await businessProfileApi.getSentInvitations(profileId, {
          page: invitationsPage,
          limit: 10
        });
        
        if (response.success && response.data) {
          setSentInvitations(response.data.invitations);
          setInvitationSummary(response.data.summary);
          setInvitationsHasNextPage(response.data.pagination.hasNextPage);
        } else {
          console.error('Failed to fetch sent invitations:', response.message);
          setSentInvitations([]);
        }
      } catch (error) {
        console.error('Error fetching sent invitations:', error);
        setSentInvitations([]);
      } finally {
        setInvitationsLoading(false);
      }
    };

    fetchSentInvitations();
  }, [businessProfile.profileId, invitationsPage, activeTab]);

  // Fetch team members from API
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const profileId = businessProfile.profileId;
        
        if (!profileId) {
          console.error('Business profile ID not found');
          setLoading(false);
          return;
        }

        const response = await businessProfileApi.getMembers(profileId, {
          page: currentPage,
          limit: 10
        });
        
        if (response.success && response.data) {
          // Transform API response to match our TeamMember interface
          const transformedMembers: TeamMember[] = response.data.members.map((member: Member) => ({
            id: member.memberId,
            userId: member.userId,
            name: member.name,
            email: member.email,
            role: member.role as 'owner' | 'admin' | 'editor',
            status: member.isActive ? 'active' : 'inactive',
            joinedDate: member.joinedAt,
            lastActive: member.lastActive || undefined,
            avatar: member.avatar || undefined,
            isActive: member.isActive
          }));
          
          setMembers(transformedMembers);
          setMemberSummary(response.data.summary);
          setHasNextPage(response.data.pagination.hasNextPage);
        } else {
          console.error('Failed to fetch members:', response.message);
          setMembers([]);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [businessProfile.profileId, currentPage]);

  // Search users function
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await businessProfileApi.searchProfiles(query.trim());
      if (response.success && response.data) {
        setSearchResults(response.data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle search input change with debounce
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  // Handle user invitation
  const handleInviteUser = async (user: SearchUser) => {
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);
    
    try {
      // Get the business profile ID from the businessProfile object
      const profileId = businessProfile.profileId;
      
      if (!profileId) {
        throw new Error('Business profile ID not found');
      }

      // Send invitation through API
      const response = await businessProfileApi.inviteUser(
        profileId,
        user.user_id,
        selectedRole
      );
      
      if (response.success && response.data) {
        // Add to pending members list using real API response data
        const newMember: TeamMember = {
          id: response.data.invitationId,
          userId: response.data.inviteeId,
          name: response.data.inviteeName || `${user.first_name} ${user.last_name}`,
          email: response.data.inviteeEmail,
          role: response.data.role as 'owner' | 'admin' | 'editor',
          status: 'pending',
          joinedDate: response.data.createdAt,
          avatar: user.avatar_url || undefined,
          isActive: false // Since it's pending
        };
        
        setMembers(prev => [...prev, newMember]);
        setInviteSuccess(`Invitation sent successfully to ${response.data.inviteeName}`);
        
        // Refresh members list to get updated data
        setTimeout(async () => {
          try {
            const updatedResponse = await businessProfileApi.getMembers(profileId, {
              page: currentPage,
              limit: 10
            });
            
            if (updatedResponse.success && updatedResponse.data) {
              const transformedMembers: TeamMember[] = updatedResponse.data.members.map((member: Member) => ({
                id: member.memberId,
                userId: member.userId,
                name: member.name,
                email: member.email,
                role: member.role as 'owner' | 'admin' | 'editor',
                status: member.isActive ? 'active' : 'inactive',
                joinedDate: member.joinedAt,
                lastActive: member.lastActive || undefined,
                avatar: member.avatar || undefined,
                isActive: member.isActive
              }));
              
              setMembers(transformedMembers);
              setMemberSummary(updatedResponse.data.summary);
            }
          } catch (error) {
            console.error('Failed to refresh members list:', error);
          }
        }, 1000);

        // Also refresh sent invitations if on that tab
        if (activeTab === 'invitations') {
          try {
            const invitationsResponse = await businessProfileApi.getSentInvitations(profileId, {
              page: invitationsPage,
              limit: 10
            });
            
            if (invitationsResponse.success && invitationsResponse.data) {
              setSentInvitations(invitationsResponse.data.invitations);
              setInvitationSummary(invitationsResponse.data.summary);
            }
          } catch (error) {
            console.error('Failed to refresh sent invitations:', error);
          }
        }
        
        // Clear modal after 2 seconds
        setTimeout(() => {
          setShowInviteModal(false);
          setSearchQuery("");
          setSearchResults([]);
          setInviteSuccess(null);
        }, 2000);
        
        console.log('Invitation sent successfully:', response.data);
      } else {
        throw new Error(response.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to invite user:', error);
      setInviteError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle promoting a member (editor -> admin)
  const handlePromoteMember = async (member: TeamMember) => {
    if (member.role !== 'editor') return;
    
    setPromoteDemoteLoading(member.id);
    setRoleChangeError(null);
    setRoleChangeSuccess(null);
    
    try {
      const profileId = businessProfile.profileId;
      
      if (!profileId) {
        throw new Error('Business profile ID not found');
      }

      const response = await businessProfileApi.promoteMember(profileId, member.id);
      
      if (response.success && response.data) {
        setRoleChangeSuccess(`${member.name} has been promoted to Admin successfully`);
        
        // Update the member in local state
        setMembers(prev => prev.map(m => 
          m.id === member.id 
            ? { ...m, role: 'admin' as const }
            : m
        ));
        
        // Refresh member summary
        if (memberSummary) {
          setMemberSummary({
            ...memberSummary,
            admins: memberSummary.admins + 1,
            editors: memberSummary.editors - 1
          });
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setRoleChangeSuccess(null), 3000);
      } else {
        throw new Error(response.message || 'Failed to promote member');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to promote member';
      setRoleChangeError(errorMessage);
      console.error('Failed to promote member:', error);
      
      // Clear error message after 5 seconds
      setTimeout(() => setRoleChangeError(null), 5000);
    } finally {
      setPromoteDemoteLoading(null);
    }
  };

  // Handle demoting a member (admin -> editor)
  const handleDemoteMember = async (member: TeamMember) => {
    if (member.role !== 'admin') return;
    
    setPromoteDemoteLoading(member.id);
    setRoleChangeError(null);
    setRoleChangeSuccess(null);
    
    try {
      const profileId = businessProfile.profileId;
      
      if (!profileId) {
        throw new Error('Business profile ID not found');
      }

      const response = await businessProfileApi.demoteMember(profileId, member.id);
      
      if (response.success && response.data) {
        setRoleChangeSuccess(`${member.name} has been demoted to Editor successfully`);
        
        // Update the member in local state
        setMembers(prev => prev.map(m => 
          m.id === member.id 
            ? { ...m, role: 'editor' as const }
            : m
        ));
        
        // Refresh member summary
        if (memberSummary) {
          setMemberSummary({
            ...memberSummary,
            admins: memberSummary.admins - 1,
            editors: memberSummary.editors + 1
          });
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setRoleChangeSuccess(null), 3000);
      } else {
        throw new Error(response.message || 'Failed to demote member');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to demote member';
      setRoleChangeError(errorMessage);
      console.error('Failed to demote member:', error);
      
      // Clear error message after 5 seconds
      setTimeout(() => setRoleChangeError(null), 5000);
    } finally {
      setPromoteDemoteLoading(null);
    }
  };

  // Handle removing a member from the business profile
  const handleRemoveMember = async (member: TeamMember) => {
    if (member.role === 'owner') return;
    
    setRemoveLoading(member.id);
    setRoleChangeError(null);
    setRoleChangeSuccess(null);
    
    try {
      const profileId = businessProfile.profileId;
      
      if (!profileId) {
        throw new Error('Business profile ID not found');
      }

      const response = await businessProfileApi.removeMember(profileId, member.id);
      
      if (response.success && response.data) {
        setRoleChangeSuccess(`${member.name} has been removed from the business profile`);
        
        // Remove the member from local state
        setMembers(prev => prev.filter(m => m.id !== member.id));
        
        // Update member summary
        if (memberSummary) {
          const updatedSummary = {
            ...memberSummary,
            totalMembers: memberSummary.totalMembers - 1,
            activeMembers: member.status === 'active' ? memberSummary.activeMembers - 1 : memberSummary.activeMembers
          };
          
          // Adjust role counts
          if (member.role === 'admin') {
            updatedSummary.admins = memberSummary.admins - 1;
          } else if (member.role === 'editor') {
            updatedSummary.editors = memberSummary.editors - 1;
          }
          
          setMemberSummary(updatedSummary);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setRoleChangeSuccess(null), 3000);
      } else {
        throw new Error(response.message || 'Failed to remove member');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
      setRoleChangeError(errorMessage);
      console.error('Failed to remove member:', error);
      
      // Clear error message after 5 seconds
      setTimeout(() => setRoleChangeError(null), 5000);
    } finally {
      setRemoveLoading(null);
      setShowRemoveConfirm(null);
    }
  };

  // Handle canceling a sent invitation
  const handleCancelInvitation = async (invitation: SentInvitation) => {
    if (invitation.status !== 'pending') return;
    
    setCancelLoading(invitation.invitationId);
    setRoleChangeError(null);
    setRoleChangeSuccess(null);
    
    try {
      const profileId = businessProfile.profileId;
      
      if (!profileId) {
        throw new Error('Business profile ID not found');
      }

      const response = await businessProfileApi.cancelInvitation(profileId, invitation.invitationId);
      
      if (response.success && response.data) {
        setRoleChangeSuccess(`Invitation to ${invitation.inviteeName} has been cancelled`);
        
        // Update the invitation status in local state
        setSentInvitations(prev => prev.map(inv => 
          inv.invitationId === invitation.invitationId 
            ? { ...inv, status: 'cancelled' as const }
            : inv
        ));
        
        // Update invitation summary
        if (invitationSummary) {
          setInvitationSummary({
            ...invitationSummary,
            pending: invitationSummary.pending - 1,
            cancelled: invitationSummary.cancelled + 1
          });
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setRoleChangeSuccess(null), 3000);
      } else {
        throw new Error(response.message || 'Failed to cancel invitation');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel invitation';
      setRoleChangeError(errorMessage);
      console.error('Failed to cancel invitation:', error);
      
      // Clear error message after 5 seconds
      setTimeout(() => setRoleChangeError(null), 5000);
    } finally {
      setCancelLoading(null);
      setShowCancelConfirm(null);
    }
  };

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Filter sent invitations
  const filteredInvitations = sentInvitations.filter((invitation) => {
    const matchesSearch = 
      invitation.inviteeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invitation.inviteeEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || invitation.role === roleFilter;
    const matchesStatus = statusFilter === "all" || invitation.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'admin': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'editor': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'accepted': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'declined': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
      case 'inactive': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'declined': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      case 'inactive': return <UserX className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading && activeTab === 'members') {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                Team Management
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                Manage team members and their permissions
                {activeTab === 'members' && memberSummary && (
                  <span className="block text-xs sm:text-sm mt-1">
                    {memberSummary.totalMembers} total • {memberSummary.activeMembers} active • {memberSummary.admins} admins • {memberSummary.editors} editors
                  </span>
                )}
                {activeTab === 'invitations' && invitationSummary && (
                  <span className="block text-xs sm:text-sm mt-1">
                    {invitationSummary.pending} pending • {invitationSummary.accepted} accepted • {invitationSummary.declined} declined
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Role Change Messages */}
            {roleChangeSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{roleChangeSuccess}</span>
              </motion.div>
            )}
            {roleChangeError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl text-sm"
              >
                <AlertCircle className="h-4 w-4" />
                <span>{roleChangeError}</span>
              </motion.div>
            )}
            
            {(businessProfile.role === 'owner' || businessProfile.role === 'admin') && (
              <Button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="flex border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors ${
              activeTab === 'members'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Team Members
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors ${
              activeTab === 'invitations'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Send className="h-4 w-4 inline mr-2" />
            Sent Invitations
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder={activeTab === 'members' ? "Search members..." : "Search invitations..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
              </select>
            </div>
          </div>
          {activeTab === 'invitations' && (
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {activeTab === 'members' 
              ? `Team Members (${filteredMembers.length})` 
              : `Sent Invitations (${filteredInvitations.length})`
            }
          </h3>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                  No members found
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {searchTerm || roleFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Invite team members to get started"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {filteredMembers.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm sm:text-base flex-shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                            />
                          ) : (
                            member.name.split(' ').map(n => n[0]).join('')
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base sm:text-lg font-medium text-neutral-900 dark:text-white truncate">
                            {member.name}
                          </h4>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                            {member.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                              <Shield className="h-3 w-3 inline mr-1" />
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="text-left sm:text-right text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                          <p>Joined {new Date(member.joinedDate).toLocaleDateString()}</p>
                          {member.lastActive && (
                            <p className="hidden sm:block">Last active {new Date(member.lastActive).toLocaleDateString()}</p>
                          )}
                        </div>
                        
                        {businessProfile.role === 'owner' && member.role !== 'owner' && (
                          <div className="flex items-center gap-2">
                            {/* Promote/Demote buttons for role management */}
                            {member.role === 'editor' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromoteMember(member)}
                                disabled={promoteDemoteLoading === member.id}
                                className="h-8 px-3 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/40"
                              >
                                {promoteDemoteLoading === member.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Promoting...
                                  </>
                                ) : (
                                  'Promote to Admin'
                                )}
                              </Button>
                            )}
                            
                            {member.role === 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDemoteMember(member)}
                                disabled={promoteDemoteLoading === member.id}
                                className="h-8 px-3 text-xs bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/40"
                              >
                                {promoteDemoteLoading === member.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Demoting...
                                  </>
                                ) : (
                                  'Demote to Editor'
                                )}
                              </Button>
                            )}
                            
                            {/* Remove Member Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowRemoveConfirm(member.id)}
                              disabled={removeLoading === member.id}
                              className="h-8 px-3 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/40"
                            >
                              {removeLoading === member.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Remove
                                </>
                              )}
                            </Button>
                            
                            {/* <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button> */}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* Members Pagination */}
            {memberSummary && memberSummary.totalMembers > 10 && (
              <div className="p-4 sm:p-6 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 text-center sm:text-left">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, memberSummary.totalMembers)} of {memberSummary.totalMembers} members
                  </p>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="text-xs sm:text-sm"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={!hasNextPage}
                      className="text-xs sm:text-sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <>
            {invitationsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredInvitations.length === 0 ? (
              <div className="p-8 text-center">
                <Send className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                  No invitations found
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Send invitations to see them here"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {filteredInvitations.map((invitation) => (
                  <motion.div
                    key={invitation.invitationId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm sm:text-base flex-shrink-0">
                          {invitation.inviteeAvatar ? (
                            <img
                              src={invitation.inviteeAvatar}
                              alt={invitation.inviteeName}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                            />
                          ) : (
                            invitation.inviteeName.split(' ').map(n => n[0]).join('')
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base sm:text-lg font-medium text-neutral-900 dark:text-white truncate">
                            {invitation.inviteeName}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}>
                              <Shield className="h-3 w-3 inline mr-1" />
                              {invitation.role}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(invitation.status)}`}>
                              {getStatusIcon(invitation.status)}
                              {invitation.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="text-left sm:text-right text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                          <p>Sent {new Date(invitation.createdAt).toLocaleDateString()}</p>
                          <p className="hidden sm:block">
                            {new Date(invitation.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {invitation.status === 'pending' && (businessProfile.role === 'owner' || businessProfile.role === 'admin') && (
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setShowCancelConfirm(invitation.invitationId)}
                              disabled={cancelLoading === invitation.invitationId}
                              className="text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              {cancelLoading === invitation.invitationId ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Cancelling...
                                </>
                              ) : (
                                'Cancel'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Invitations Pagination */}
            {invitationSummary && Object.values(invitationSummary).reduce((a, b) => a + b, 0) > 10 && (
              <div className="p-4 sm:p-6 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 text-center sm:text-left">
                    Showing {((invitationsPage - 1) * 10) + 1} to {Math.min(invitationsPage * 10, Object.values(invitationSummary).reduce((a, b) => a + b, 0))} invitations
                  </p>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvitationsPage(prev => Math.max(1, prev - 1))}
                      disabled={invitationsPage === 1}
                      className="text-xs sm:text-sm"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvitationsPage(prev => prev + 1)}
                      disabled={!invitationsHasNextPage}
                      className="text-xs sm:text-sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setShowInviteModal(false);
            setSearchQuery("");
            setSearchResults([]);
            setInviteError(null);
            setInviteSuccess(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-6 max-w-lg w-full mx-4 max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
                Invite Team Member
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                  setInviteError(null);
                  setInviteSuccess(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search users by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Role Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'editor')}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            {/* Success/Error Messages */}
            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {inviteSuccess}
              </div>
            )}
            
            {inviteError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {inviteError}
              </div>
            )}
            
            {/* Search Results */}
            <div className="flex-1 overflow-auto">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-neutral-600 dark:text-neutral-400">Searching...</span>
                </div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">
                    No users found matching &quot;{searchQuery}&quot;
                  </p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Found {searchResults.length} user(s)
                  </h4>
                  {searchResults.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={`${user.first_name} ${user.last_name}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            `${user.first_name[0]}${user.last_name[0]}`
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-neutral-900 dark:text-white truncate">
                            {user.first_name} {user.last_name}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleInviteUser(user)}
                        disabled={inviteLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto flex-shrink-0"
                      >
                        {inviteLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Inviting...
                          </>
                        ) : (
                          'Invite'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Start typing to search for users to invite
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Remove Member Confirmation Modal */}
      {showRemoveConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowRemoveConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const memberToRemove = members.find(m => m.id === showRemoveConfirm);
              return (
                <>
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 text-center">
                    Remove Team Member
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-center">
                    Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this business profile? 
                    They will lose access to manage the business page and all related permissions.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowRemoveConfirm(null)} 
                      disabled={removeLoading === showRemoveConfirm}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
                      disabled={removeLoading === showRemoveConfirm}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {removeLoading === showRemoveConfirm ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Member
                        </>
                      )}
                    </Button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
      
      {/* Cancel Invitation Confirmation Modal */}
      {showCancelConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCancelConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const invitationToCancel = sentInvitations.find(inv => inv.invitationId === showCancelConfirm);
              return (
                <>
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 text-center">
                    Cancel Invitation
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-center">
                    Are you sure you want to cancel the invitation sent to <strong>{invitationToCancel?.inviteeName}</strong>? 
                    This action cannot be undone and they will not be able to accept the invitation.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCancelConfirm(null)} 
                      disabled={cancelLoading === showCancelConfirm}
                    >
                      Keep Invitation
                    </Button>
                    <Button 
                      onClick={() => invitationToCancel && handleCancelInvitation(invitationToCancel)}
                      disabled={cancelLoading === showCancelConfirm}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {cancelLoading === showCancelConfirm ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancel Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}