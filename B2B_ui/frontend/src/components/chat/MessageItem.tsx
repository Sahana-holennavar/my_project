'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Check, X, Download, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ChatMessage } from '@/lib/api/socket-chat';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  avatarSrc?: string;
  avatarFallback: string;
  onEdit: (messageId: string, newContent: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  formatTime: (date: Date | string) => string;
}

export function MessageItem({
  message,
  isOwn,
  showAvatar,
  avatarSrc,
  avatarFallback,
  onEdit,
  onDelete,
  formatTime,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if message can be edited (within 15 minutes)
  const canEdit = (): boolean => {
    if (!isOwn) return false;
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    return now - messageTime <= fifteenMinutes;
  };

  // Check if message can be deleted (anytime for own messages)
  const canDelete = (): boolean => {
    return isOwn;
  };

  // Get message content as string
  const getMessageContent = (): string => {
    if (typeof message.content === 'string') return message.content;
    if (typeof message.content === 'object' && message.content !== null) {
      const contentObj = message.content as { type?: string; text?: string };
      if (contentObj.type === 'text' && contentObj.text) return contentObj.text;
    }
    return '';
  };

  // Render message content based on type
  const renderContent = () => {
    const content = message.content;

    // Handle string content
    if (typeof content === 'string') {
      return (
        <p className="text-sm break-words">
          {content}
        </p>
      );
    }

    // Handle object content
    if (typeof content === 'object' && content !== null) {
      const contentObj = content as { type?: string; text?: string; fileUrl?: string; fileName?: string; fileType?: string };

      // Text message
      if (contentObj.type === 'text' && contentObj.text) {
        return (
          <p className="text-sm break-words">
            {contentObj.text}
          </p>
        );
      }

      // Image message
      if (contentObj.type === 'image' && contentObj.fileUrl) {
        return (
          <div className="space-y-2">
            <div className="rounded-lg overflow-hidden max-w-sm">
              <img 
                src={contentObj.fileUrl} 
                alt={contentObj.fileName || 'Image'} 
                className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(contentObj.fileUrl, '_blank')}
              />
            </div>
            {contentObj.text && (
              <p className="text-sm break-words">{contentObj.text}</p>
            )}
          </div>
        );
      }

      // Video message
      if (contentObj.type === 'video' && contentObj.fileUrl) {
        return (
          <div className="space-y-2">
            <div className="rounded-lg overflow-hidden max-w-sm">
              <video 
                src={contentObj.fileUrl} 
                controls 
                className="w-full h-auto"
              />
            </div>
            {contentObj.text && (
              <p className="text-sm break-words">{contentObj.text}</p>
            )}
          </div>
        );
      }

      // File/Document message
      if (contentObj.type === 'file' && contentObj.fileUrl) {
        return (
          <div className="space-y-2">
            <a
              href={contentObj.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{contentObj.fileName || 'File'}</p>
                {contentObj.fileType && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{contentObj.fileType}</p>
                )}
              </div>
              <Download className="h-4 w-4 flex-shrink-0" />
            </a>
            {contentObj.text && (
              <p className="text-sm break-words">{contentObj.text}</p>
            )}
          </div>
        );
      }
    }

    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Unsupported message type</p>;
  };

  // Handle edit start
  const handleEditStart = () => {
    setEditedContent(getMessageContent());
    setIsEditing(true);
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  // Handle delete
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(message.id);
      setShowDeleteDialog(false);
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit submit
  const handleEditSubmit = async () => {
    const trimmedContent = editedContent.trim();
    if (!trimmedContent || trimmedContent === getMessageContent()) {
      handleEditCancel();
      return;
    }

    setIsSubmitting(true);
    try {
      await onEdit(message.id, trimmedContent);
      setIsEditing(false);
      setEditedContent('');
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <Avatar className={`h-8 w-8 ${showAvatar ? '' : 'invisible'}`}>
          <AvatarImage src={avatarSrc} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-md`}>
        <div className="relative">
          {/* More Options Button - Only for own messages */}
          {isOwn && (canEdit() || canDelete()) && !isEditing && (
            <div
              className={`absolute ${
                isOwn ? 'left-0 -translate-x-8' : 'right-0 translate-x-8'
              } top-1/2 -translate-y-1/2 transition-opacity ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-white dark:bg-neutral-700 shadow-sm hover:bg-neutral-100 dark:hover:bg-neutral-600"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                  {canEdit() && (
                    <DropdownMenuItem onClick={handleEditStart}>Edit Message</DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Message'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Message Bubble */}
          {isEditing ? (
            <div className="min-w-[200px]">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  className="text-sm"
                  placeholder="Edit your message..."
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleEditSubmit}
                  disabled={isSubmitting || !editedContent.trim()}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleEditCancel}
                  disabled={isSubmitting}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 px-2">
                Press Enter to save, Esc to cancel
              </p>
            </div>
          ) : (
            <div
              className={`px-4 py-2 rounded-2xl ${
                isOwn
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {renderContent()}
              {message.edited_at && (
                <p className="text-xs opacity-70 mt-1">
                  (edited)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {!isEditing && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 px-2">
            {formatTime(message.created_at)}
          </span>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
