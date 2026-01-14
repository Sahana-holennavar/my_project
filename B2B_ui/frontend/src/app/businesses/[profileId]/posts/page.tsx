"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchUserBusinessProfiles, setSelectedProfile, type BusinessProfileState } from "@/store/slices/businessProfileSlice";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Settings,
  BarChart3,
  Shield,
  Building2,
  Loader2,
  AlertCircle,
  UserCog,
  Briefcase,
  PenTool,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Tag,
  Image,
  Video,
  FileText,
  Search,
  Filter,
  MoreVertical,
  X,
  Upload,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { PostPreview } from "@/components/posts/PostPreview";
import { 
  fetchBusinessPosts,
  createBusinessPost,
  updateBusinessPost,
  deleteBusinessPost,
  selectBusinessPosts,
  selectBusinessPostsLoading,
  selectBusinessPostsPagination,
} from "@/store/slices/businessPostsSlice";
import type { BusinessProfile, BusinessProfilePost, CreateBusinessProfilePostData } from "@/types/auth";
import type { PreviewData, MediaFile } from "@/types/posts";

export default function BusinessPostsPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const profileId = params?.profileId as string;
  
  const { 
    selectedProfile,
    profiles,
    fetching: fetchingProfiles
  } = useAppSelector((state: { businessProfile: BusinessProfileState }) => state.businessProfile);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const posts = useAppSelector(selectBusinessPosts);
  const postsLoading = useAppSelector(selectBusinessPostsLoading);
  const postsPagination = useAppSelector(selectBusinessPostsPagination);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BusinessProfilePost | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const operationInProgress = useRef(false);

  // Form state for create/edit
  const [formData, setFormData] = useState<CreateBusinessProfilePostData>({
    title: "",
    content: "",
    tags: [],
    media: undefined
  });
  const [tagInput, setTagInput] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (mediaPreview && mediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  // Fetch business profile data
  useEffect(() => {
    if (!profileId) {
      setError("Invalid business profile ID");
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Fetch all business profiles including inactive ones
        const profilesResult = await dispatch(fetchUserBusinessProfiles({ includeInactive: true })).unwrap();
        
        // Find the specific profile
        const currentProfile = profilesResult.find((profile: BusinessProfile) => profile.profileId === profileId);
        
        if (currentProfile) {
          dispatch(setSelectedProfile(currentProfile));
          
          // Check if user has access to manage posts
          if (!['owner', 'admin', 'editor'].includes(currentProfile.role)) {
            setError("You don't have permission to manage posts for this business");
            setLoading(false);
            return;
          }
        } else {
          throw new Error("Business profile not found");
        }
        
        setLoading(false);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to fetch business profile:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load business profile data";
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId, dispatch]);

  // Fetch posts
  useEffect(() => {
    if (selectedProfile && profileId) {
      fetchPosts();
    }
  }, [selectedProfile, profileId, pagination.page]);

  // Auto-refresh posts every 30 seconds (skip if operation in progress)
  useEffect(() => {
    if (selectedProfile && profileId) {
      const interval = setInterval(() => {
        if (!operationInProgress.current) {
          fetchPosts();
        }
      }, 20000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [selectedProfile, profileId, pagination.page]);

  const fetchPosts = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      }
      // Use redux thunk to fetch posts
      const res = await dispatch(fetchBusinessPosts({ profileId, page: pagination.page, limit: pagination.limit })).unwrap();
      if (res && res.pagination) {
        setPagination(prev => ({ ...prev, total: res.pagination.total }));
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      if (showRefreshIndicator) {
        setRefreshing(false);
      }
    }
  };

  const handleGoBack = () => {
    if (profileId) {
      router.push(`/businesses/${profileId}`);
    } else {
      router.push('/businesses');
    }
  };

  const handleRefresh = async () => {
    await fetchPosts(true);
  };

  const handleCreatePost = async () => {
    if (!profileId) return;
    
    operationInProgress.current = true;
    setCreating(true);
    setOperationError(null);
    try {
      await dispatch(createBusinessPost({ profileId, postData: formData })).unwrap();
      setShowCreateModal(false);
      resetForm();
      // posts slice will prepend the new post immediately
    } catch (error) {
      console.error('Failed to create post:', error);
      setOperationError('Failed to create post. Please try again.');
    } finally {
      setCreating(false);
      // Allow auto-refresh after 2 seconds
      setTimeout(() => { operationInProgress.current = false; }, 2000);
    }
  };

  const handleUpdatePost = async () => {
    if (!profileId || !selectedPost) return;
    
    operationInProgress.current = true;
    setUpdating(true);
    setOperationError(null);
    try {
      await dispatch(updateBusinessPost({ profileId, postId: selectedPost.postId, postData: formData })).unwrap();
      setShowEditModal(false);
      // setSelectedPost(null);
      resetForm();
      // Redux slice will update the post immediately
    } catch (error) {
      console.error('Failed to update post:', error);
      setOperationError('Failed to update post. Please try again.');
    } finally {
      setUpdating(false);
      // Allow auto-refresh after 2 seconds
      setTimeout(() => { operationInProgress.current = false; }, 2000);
    }
  };

  const handleDeletePost = async () => {
    if (!profileId || !selectedPost) return;
    
    operationInProgress.current = true;
    setDeleting(true);
    setOperationError(null);
    try {
      await dispatch(deleteBusinessPost({ profileId, postId: selectedPost.postId })).unwrap();
      setShowDeleteModal(false);
      setSelectedPost(null);
    } catch (error) {
      console.error('Failed to delete post:', error);
      setOperationError('Failed to delete post. Please try again.');
    } finally {
      setDeleting(false);
      // Allow auto-refresh after 2 seconds
      setTimeout(() => { operationInProgress.current = false; }, 2000);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      tags: [],
      media: undefined
    });
    setTagInput("");
    setOperationError(null);
    setFileError(null);
    
    // Clean up preview URL if it's a blob URL
    if (mediaPreview && mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaPreview(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setFileError('File size must be less than 10MB');
        event.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setFileError('Please select an image or video file');
        event.target.value = ''; // Clear the input
        return;
      }
      
      setFormData(prev => ({ ...prev, media: file }));
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const openEditModal = (post: BusinessProfilePost) => {
    const parsedTags = parseTags(post.tags || []);
    
    setOperationError(null);
    setFileError(null);
    setSelectedPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      tags: parsedTags,
      media: undefined
    });
    
    // Set preview for existing media if it's an image
    if (post.media && post.media.length > 0) {
      const first = post.media[0];
      const url = first.url;
      // Ensure absolute URL
      const abs = url.startsWith('http') ? url : `${env.API_URL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
      if (first.type.startsWith('image/')) setMediaPreview(abs);
      else setMediaPreview(null);
    } else {
      setMediaPreview(null);
    }
    
    setShowEditModal(true);
  };

  const openDeleteModal = (post: BusinessProfilePost) => {
    setOperationError(null);
    setSelectedPost(post);
    setShowDeleteModal(true);
  };

  const handlePostPreview = (post: BusinessProfilePost) => {
    const parsedTags = parseTags(post.tags || []);
    
    // Transform BusinessProfilePost to PreviewData format
    const transformedPreviewData: PreviewData = {
      content: `${post.title}\n\n${post.content}`, // Include title in content for preview
      media: (post.media || []).map(media => ({
        file: new File([], media.filename || 'media'),
        type: media.type.startsWith('image') ? 'image' as const : 'video' as const,
        url: media.url.startsWith('http') ? media.url : `${env.API_URL.replace(/\/+$/, '')}/${media.url.replace(/^\/+/, '')}`,
        name: media.filename || 'media',
        size: media.size
      } as MediaFile)),
      audience: 'public' as const,
      user: {
        name: selectedProfile?.businessName || selectedProfile?.companyProfileData?.companyName || 'Business',
        avatar: selectedProfile?.companyProfileData?.company_logo?.fileUrl || '',
        fallback: selectedProfile?.businessName?.[0] || selectedProfile?.companyProfileData?.companyName?.[0] || 'B'
      }
    };
    
    // Store the original post for edit functionality
    setSelectedPost(post);
    setPreviewData(transformedPreviewData);
    setShowPreviewModal(true);
  };

  // Helper function to parse tags that might be double-stringified
  const parseTags = (tags: string[] | string): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags) && tags.length > 0) {
      // Check if the first element looks like stringified JSON
      const firstTag = tags[0];
      if (typeof firstTag === 'string' && (firstTag.startsWith('[') || firstTag.startsWith('["'))) {
        try {
          // Try to parse it as JSON
          const parsed = JSON.parse(firstTag);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          console.warn('Failed to parse tags:', firstTag);
          return tags;
        }
      }
      return tags;
    }
    if (typeof tags === 'string') {
      try {
        return JSON.parse(tags);
      } catch (e) {
        return [tags];
      }
    }
    return [];
  };

  // Filter posts based on search term
  const filteredPosts = posts.filter(post => {
    const parsedTags = parseTags(post.tags || []);
    return (
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsedTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const getMediaIcon = (mediaType: string) => {
    if (mediaType.startsWith('image')) return <Image className="h-4 w-4" />;
    if (mediaType.startsWith('video')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Loading state
  if (loading || fetchingProfiles) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading posts...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !selectedProfile) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {error || "You don't have permission to manage posts for this business"}
          </p>
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoBack}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Business Profile</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <PenTool className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
                    Posts Management
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {selectedProfile.businessName || selectedProfile.companyProfileData?.companyName}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end sm:gap-2">
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                selectedProfile.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                selectedProfile.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {selectedProfile.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Posts Management Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  Business Posts
                </h2>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                  Create and manage posts to reach a wider audience 
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </span>
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </div>
            </div>
            
            {/* Search */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Posts List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
        >
          {filteredPosts.length === 0 ? (
            <div className="p-8 text-center">
              <PenTool className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No posts found
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                {searchTerm ? "Try adjusting your search" : "Start by creating your first post"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => {
                    setOperationError(null);
                    setFileError(null);
                    setShowCreateModal(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Post
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredPosts.map((post) => (
                <motion.div
                  key={post.postId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-lg font-semibold text-neutral-900 dark:text-white mb-2 line-clamp-1 cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        onClick={() => handlePostPreview(post)}
                      >
                        {post.title}
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                        {post.content}
                      </p>
                      
                      {/* Tags */}
                      {(() => {
                        const parsedTags = parseTags(post.tags || []);
                        return parsedTags && parsedTags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {parsedTags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs rounded-full flex items-center gap-1"
                              >
                                <Tag className="h-3 w-3" />
                                {tag}
                              </span>
                            ))}
                            {parsedTags.length > 3 && (
                              <span className="px-2 py-1 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 text-xs rounded-full">
                                +{parsedTags.length - 3} more
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* Media indicator */}
                      {post.media?.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          {post.media.slice(0, 3).map((media, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 text-xs rounded-full"
                            >
                              {getMediaIcon(media.type)}
                              <span>{media.type.split('/')[0]}</span>
                            </div>
                          ))}
                          {post.media.length > 3 && (
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 text-xs rounded-full">
                              +{post.media.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        {post.updatedAt !== post.createdAt && (
                          <span className="flex items-center gap-1">
                            <Edit className="h-3 w-3" />
                            Updated {new Date(post.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(post)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteModal(post)}
                        className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="p-6 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} posts
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page * pagination.limit >= pagination.total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Create New Post</h3>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                disabled={creating}
                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Post Title
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter post title..."
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your post content..."
                  rows={6}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-neutral-800 dark:text-white resize-none"
                />
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Tags
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Enter tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1"
                    />
                    <Button onClick={handleAddTag} type="button" variant="outline">
                      Add
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-full flex items-center gap-2 text-sm"
                        >
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Media (Optional)
                </label>
                
                {/* File Error Display */}
                {fileError && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <p className="text-red-700 dark:text-red-400 text-sm">{fileError}</p>
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="media-upload"
                />
                <label
                  htmlFor="media-upload"
                  className="block w-full p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer text-center"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
                  <p className="text-neutral-600 dark:text-neutral-400">Click to upload media (Max 10MB)</p>
                </label>
                
                {mediaPreview && (
                  <div className="mt-4 relative">
                    {formData.media?.type.startsWith('image/') ? (
                      <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                    ) : (
                      <video src={mediaPreview} className="w-full h-48 object-cover rounded-xl" controls />
                    )}
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, media: undefined }));
                        setMediaPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="outline"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={creating || !formData.title || !formData.content}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Post</h3>
              <button
                onClick={() => { 
                  setShowEditModal(false);
                  setSelectedPost(null);
                  resetForm();
                }}
                disabled={updating}
                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Error Display */}
            {operationError && (
              <div className="mx-6 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-400 text-sm">{operationError}</p>
                </div>
              </div>
            )}
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Post Title
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter post title..."
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your post content..."
                  rows={6}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-neutral-800 dark:text-white resize-none"
                />
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Tags
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Enter tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1"
                    />
                    <Button onClick={handleAddTag} type="button" variant="outline">
                      Add
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-full flex items-center gap-2 text-sm"
                        >
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Media Section */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Media
                </label>
                
                {/* File Error Display */}
                {fileError && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <p className="text-red-700 dark:text-red-400 text-sm">{fileError}</p>
                    </div>
                  </div>
                )}
                
                {/* Show current media if no new media selected */}
                {selectedPost?.media?.length > 0 && !mediaPreview && (
                  <div className="mb-4">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Current Media:</p>
                    <div className="grid grid-cols-2 gap-4">
                      {(selectedPost.media || []).map((media, index) => {
                        const url = media.url;
                        const abs = url.startsWith('http') ? url : `${env.API_URL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
                        return (
                        <div key={index} className="relative">
                          {media.type.startsWith('image') ? (
                            <img src={abs} alt={media.filename || 'Current Media'} className="w-full h-32 object-cover rounded-xl" />
                          ) : (
                            <video src={abs} className="w-full h-32 object-cover rounded-xl" controls />
                          )}
                        </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Media upload area */}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="edit-media-upload"
                />
                <label
                  htmlFor="edit-media-upload"
                  className="block w-full p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer text-center"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {selectedPost?.media?.length > 0 && !mediaPreview 
                      ? "Click to replace current media (Max 10MB)" 
                      : "Click to upload media (Max 10MB)"
                    }
                  </p>
                </label>
                
                {/* New media preview */}
                {mediaPreview && (
                  <div className="mt-4 relative">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">New Media Preview:</p>
                    {formData.media?.type.startsWith('image/') ? (
                      <img src={mediaPreview} alt="New Preview" className="w-full h-48 object-cover rounded-xl" />
                    ) : formData.media?.type.startsWith('video/') ? (
                      <video src={mediaPreview} className="w-full h-48 object-cover rounded-xl" controls />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                    )}
                    <button
                      onClick={() => {
                        if (mediaPreview && mediaPreview.startsWith('blob:')) {
                          URL.revokeObjectURL(mediaPreview);
                        }
                        setFormData(prev => ({ ...prev, media: undefined }));
                        setMediaPreview(null);
                        // Clear the file input
                        const fileInput = document.getElementById('edit-media-upload') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPost(null);
                  resetForm();
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePost}
                disabled={updating || !formData.title || !formData.content}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Post
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md"
          >
            <div className="p-6">
              {/* Error Display */}
              {operationError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-red-700 dark:text-red-400 text-sm">{operationError}</p>
                  </div>
                </div>
              )}
              
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 text-center">
                Delete Post
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-center">
                Are you sure you want to delete &ldquo;<strong>{selectedPost.title}</strong>&rdquo;? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteModal(false); setSelectedPost(null); }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeletePost}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Post Preview Modal */}
      <PostPreview
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewData(null);
          setSelectedPost(null);
        }}
        previewData={previewData}
        onEdit={() => {
          // Close preview and open edit modal using the stored selectedPost
          setShowPreviewModal(false);
          setPreviewData(null);
          if (selectedPost) {
            openEditModal(selectedPost);
          }
        }}
        onPost={() => {
          // This is just for preview, close the modal
          setShowPreviewModal(false);
          setPreviewData(null);
          setSelectedPost(null);
        }}
      />
    </div>
  );
}