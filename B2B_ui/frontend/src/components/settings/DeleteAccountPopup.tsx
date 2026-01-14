'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { deleteAccountAsync } from '@/store/slices/authSlice'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/common/loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface DeleteAccountPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function DeleteAccountPopup({ isOpen, onClose }: DeleteAccountPopupProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [loading, setLoading] = useState(false)

  const handleDeleteConfirm = async () => {
    setLoading(true)
    
    try {
      // Dispatch the delete account async thunk
      await dispatch(deleteAccountAsync()).unwrap()
      
      // Show success message
      toast.success('Account deleted successfully. You can restore it by logging in within 30 days.')
      
      // Close modal
      onClose()
      
      // Logout user and redirect to login
      // The logout will be handled by the thunk after successful deletion
      setTimeout(() => {
        router.push('/login')
      }, 2000)
      
    } catch (error: unknown) {
      // Show error message
      const message = error && typeof error === 'object' && 'message' in error 
        ? (error as { message?: string }).message 
        : undefined
      toast.error(message || 'Failed to delete account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="p-4 bg-brand-error-50 dark:bg-brand-error-950 rounded-full mb-4">
            <Trash2 className="h-8 w-8 text-brand-error-600 dark:text-brand-error-400" />
          </div>
          
          {/* Title */}
          <DialogTitle className="text-xl font-semibold text-foreground mb-2">
            Delete Your Account?
          </DialogTitle>
          
          {/* Description */}
          <DialogDescription className="text-sm text-muted-foreground mb-4">
            Your account will be marked for deletion. You can restore it by logging in within 30 days.
          </DialogDescription>

          {/* Warning Box */}
          <div className="w-full bg-brand-error-50 dark:bg-brand-error-950/50 border border-brand-error-200 dark:border-brand-error-800 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-brand-error-600 dark:text-brand-error-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h4 className="text-sm font-semibold text-brand-error-900 dark:text-brand-error-100 mb-2">
                  Important Information
                </h4>
                <ul className="space-y-1.5 text-xs text-brand-error-700 dark:text-brand-error-200">
                  <li className="flex items-start">
                    <AlertTriangle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
                    <span>Your account will be marked for deletion immediately</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0 text-brand-success-600" />
                    <span>You can restore your account by logging in within 30 days</span>
                  </li>
                  <li className="flex items-start">
                    <XCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
                    <span>After 30 days, all your data will be permanently deleted</span>
                  </li>
                  <li className="flex items-start">
                    <XCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
                    <span>You will be logged out immediately after deletion</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteConfirm}
            disabled={loading}
            className="flex-1 rounded-xl"
          >
            {loading ? (
              <div className="flex items-center gap-2 w-full justify-center">
                <Loading size="sm" text="Deleting Account..." />
              </div>
            ) : (
              'Yes, Delete My Account'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
