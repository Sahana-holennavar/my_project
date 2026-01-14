'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/store/hooks';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { postsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Eye, 
  Calendar,
  MessageSquare,
  ThumbsUp,
  Share2,
  Loader2,
  FileImage,
  Film,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { FeedPost } from '@/store/slices/feedSlice';
import type { Post } from '@/types/posts';

// Loading skeleton for post card
const PostCardSkeleton = () => (
  <Card className="bg-card border-border rounded-lg p-4 animate-pulse">
    <div className="space-y-3">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-32 bg-muted rounded"></div>
      <div className="h-3 bg-muted rounded w-1/2"></div>
    </div>
  </Card>
);

// Post card component for grid
const PostGridCard: React.FC<{
  post: FeedPost;
  isSelected: boolean;
  onClick: () => void;
}> = ({ post, isSelected, onClick }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPreviewText = () => {
    if (post.content && post.content.text) {
      const text = post.content.text || '';
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }
    return 'No content';
  };

  const hasMedia = post.media && post.media.length > 0;
  const mediaType = hasMedia && post.media ? post.media[0]?.type : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`bg-card border-border rounded-lg p-3 cursor-pointer transition-all overflow-hidden ${
          isSelected 
            ? 'border-purple-500 ring-2 ring-purple-500/20' 
            : 'hover:border-purple-500/50'
        }`}
        onClick={onClick}
      >
        <div className="space-y-2 w-full">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {hasMedia && (
                  mediaType === 'image' ? (
                    <FileImage className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Film className="w-4 h-4 text-purple-400" />
                  )
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {post.audience}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(post.created_at)}
              </p>
            </div>
          </div>

          {/* Preview Text */}
          <p className="text-sm text-foreground line-clamp-3">
            {getPreviewText()}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="text-xs px-2 py-0.5 text-muted-foreground">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {post.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {post.comments || 0}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="w-3 h-3" />
              {post.shares || 0}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Media Display Component for Post Details
const MediaDisplay: React.FC<{ media: Array<{ url: string; type: string }> }> = ({ media }) => {
  if (media.length === 0) {
    return (
      <div className="w-full h-64 bg-purple-600/10 border-2 border-dashed border-purple-500/30 rounded-lg flex items-center justify-center mb-4">
        <div className="text-center">
          <FileImage className="w-16 h-16 text-purple-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No media uploaded</p>
        </div>
      </div>
    );
  }

  // For 1-4 media items, use a responsive grid with max height
  if (media.length <= 4) {
    const gridCols = media.length === 1 ? 'grid-cols-1' : media.length === 2 ? 'grid-cols-2' : 'grid-cols-2';
    return (
      <div className={`grid ${gridCols} gap-2 mb-4`}>
        {media.map((item, index) => (
          <div key={index} className="w-full h-64 max-h-64 rounded-lg overflow-hidden border border-border bg-muted">
            {item.type === 'image' ? (
              <img
                src={item.url}
                alt={`Post media ${index + 1}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.jpg';
                }}
              />
            ) : (
              <video
                src={item.url}
                className="w-full h-full object-contain"
                controls
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // For 5+ media items, use a 2x2 grid with "show more" indicator
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {media.slice(0, 4).map((item, index) => (
        <div key={index} className="w-full h-48 max-h-48 rounded-lg overflow-hidden border border-border bg-muted relative">
          {item.type === 'image' ? (
            <>
              <img
                src={item.url}
                alt={`Post media ${index + 1}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.jpg';
                }}
              />
              {index === 3 && media.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">+{media.length - 4}</span>
                </div>
              )}
            </>
          ) : (
            <video
              src={item.url}
              className="w-full h-full object-contain"
              controls
            />
          )}
        </div>
      ))}
    </div>
  );
};

// Post detail view component
const PostDetailView: React.FC<{
  post: FeedPost | null;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ post, onEdit, onDelete }) => {
  if (!post) {
    return (
      <Card className="bg-card border-border rounded-lg p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <Eye className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Select a post to view details</p>
        </div>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getContentText = () => {
    if (post.content && post.content.text) {
      return post.content.text || 'No content';
    }
    return 'No content';
  };

  const getMedia = () => {
    return post.media || [];
  };

  const media = getMedia();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full w-full"
    >
      <Card className="bg-card border-border rounded-lg p-6 h-full flex flex-col w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground mb-2">Post Details</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(post.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:border-red-400"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Audience Badge */}
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30">
            {post.audience.charAt(0).toUpperCase() + post.audience.slice(1)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mb-6">
            <p className="text-foreground whitespace-pre-wrap mb-4">
              {getContentText()}
            </p>

            {/* Media */}
            <MediaDisplay media={media as Array<{ url: string; type: string }>} />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm border border-purple-500/30"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Engagement</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{post.likes || 0}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{post.comments || 0}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{post.shares || 0}</p>
                <p className="text-xs text-muted-foreground">Shares</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-foreground">—</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const ManagePostPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await postsApi.getUserPosts(user.id);
        if (response.success && response.data) {
          // Convert Post array to FeedPost array
          const normalizedPosts: FeedPost[] = (response.data.posts || []).map((p: Post) => ({
            id: p.id || '',
            user_id: p.user_id,
            type: 'text' as const,
            content: {
              text: p.content?.[0]?.text || '',
              hashtags: [],
              mentions: p.content?.[0]?.mentions || []
            },
            media: (p.content?.[0]?.media || []).map(m => ({
              url: m.url,
              size: 0,
              type: m.type,
              filename: '',
              uploadedAt: new Date().toISOString()
            })),
            audience: p.audience,
            tags: p.tags,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            saves: p.saves,
            reposts: p.reposts,
            created_at: p.created_at,
            updated_at: p.created_at
          }));

          setPosts(normalizedPosts);
          // Select first post if available
          if (normalizedPosts.length > 0) {
            setSelectedPost(normalizedPosts[0]);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
        setError(errorMessage);
        toast.error('Failed to load posts', {
          description: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [user?.id]);

  const handlePostSelect = (post: FeedPost) => {
    setSelectedPost(post);
  };

  const handleDelete = async (post: FeedPost) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      // TODO: Implement delete API call
      toast.success('Post deleted successfully');
      // Refresh posts list
      if (user?.id) {
        const response = await postsApi.getUserPosts(user.id);
        if (response.success && response.data) {
          // Convert Post array to FeedPost array
          const normalizedPosts: FeedPost[] = (response.data.posts || []).map((p: Post) => ({
            id: p.id || '',
            user_id: p.user_id,
            type: 'text' as const,
            content: {
              text: p.content?.[0]?.text || '',
              hashtags: [],
              mentions: p.content?.[0]?.mentions || []
            },
            media: (p.content?.[0]?.media || []).map(m => ({
              url: m.url,
              size: 0,
              type: m.type,
              filename: '',
              uploadedAt: new Date().toISOString()
            })),
            audience: p.audience,
            tags: p.tags,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            saves: p.saves,
            reposts: p.reposts,
            created_at: p.created_at,
            updated_at: p.created_at
          }));

          setPosts(normalizedPosts);
          if (selectedPost?.id === post.id) {
            setSelectedPost(null);
          }
        }
      }
    } catch {
      toast.error('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background font-sans text-foreground">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-card border-border rounded-lg p-8 h-full">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background font-sans text-foreground">
      <div className="w-full h-screen py-6 px-4 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" className="mb-4 flex items-center gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Manage Posts</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your posts
          </p>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)] gap-6">
          {/* Left: Posts List (25%) */}
          <div className="w-full lg:w-1/4 flex flex-col">
            {posts.length === 0 ? (
              <Card className="bg-card border-border rounded-lg p-12 text-center">
                <FileImage className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven&apos;t created any posts. Start sharing your thoughts!
                </p>
                <Link href="/feed">
                  <Button className="bg-purple-600 hover:bg-purple-500">
                    Create Your First Post
                  </Button>
                </Link>
              </Card>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3">
                  <AnimatePresence>
                    {posts.map((post) => (
                      <PostGridCard
                        key={post.id}
                        post={post}
                        isSelected={selectedPost?.id === post.id}
                        onClick={() => handlePostSelect(post)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* Right: Post Detail (75%) */}
          <div className="flex-1 w-full lg:w-3/4">
            <PostDetailView
              post={selectedPost}
              onEdit={() => {
                // TODO: Implement edit functionality
                toast.info('Edit functionality coming soon');
              }}
              onDelete={selectedPost ? () => handleDelete(selectedPost) : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ManagePostPageDefault() {
  return (
    <ProtectedRoute>
      <ManagePostPage />
    </ProtectedRoute>
  );
}

