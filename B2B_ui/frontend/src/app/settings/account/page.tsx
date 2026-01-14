'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ChevronLeft, 
  AlertTriangle, 
  Info,
  CheckCircle2,
  Trash2
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { deactivateAccountThunk } from '@/store/slices/authSlice'
import { DeleteAccountPopup } from '@/components/settings/DeleteAccountPopup'
import { Loading } from '@/components/common/loading'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

const AccountManagementPage = () => {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const user = useAppSelector((state) => state.auth.user)
  const profile = useAppSelector((state) => state.profile.profile)

  const handleDeactivate = async () => {
    setLoading(true)
    try {
      await dispatch(deactivateAccountThunk()).unwrap()
      toast.success('Account deactivated successfully. Redirecting to login...')
      setShowDeactivateModal(false)
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined;
      toast.error(message || 'Failed to deactivate account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background dark:bg-black">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href="/settings" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Account Management</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your account status and data
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Info */}
        <Card className="mb-6 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-brand-purple-100 dark:bg-brand-purple-950 rounded-xl">
                <Info className="h-6 w-6 text-brand-purple-600 dark:text-brand-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-4">Account Information</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Your account is currently <span className="font-medium text-brand-success-600 dark:text-brand-success-400">Active</span>
                </p>
                {user && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic User Info */}
                    <div className="space-y-3">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                        <p className="text-sm font-medium text-foreground">
                          {profile?.personal_information?.first_name && profile?.personal_information?.last_name
                            ? `${profile.personal_information.first_name} ${profile.personal_information.last_name}`
                            : user.name || 'User'}
                        </p>
                      </div>
                      
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-1">Email Address</p>
                        <p className="text-sm font-medium text-foreground">{user.email}</p>
                      </div>
                      
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-1">User Type</p>
                        <p className="text-sm font-medium text-foreground capitalize">
                          {user.user_type || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Profile Info */}
                    <div className="space-y-3">
                      {profile?.personal_information?.phone_number && (
                        <div className="bg-muted/50 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                          <p className="text-sm font-medium text-foreground">
                            {profile.personal_information.phone_number}
                          </p>
                        </div>
                      )}
                      
                      {profile?.personal_information && (
                        <div className="bg-muted/50 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-1">Location</p>
                          <p className="text-sm font-medium text-foreground">
                            {[
                              profile.personal_information.city,
                              profile.personal_information.state_province,
                              profile.personal_information.country
                            ].filter(Boolean).join(', ') || 'Not provided'}
                          </p>
                        </div>
                      )}
                      
                      {user.created_at && (
                        <div className="bg-muted/50 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deactivate Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-destructive/50 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-brand-error-50 dark:bg-brand-error-950 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-brand-error-600 dark:text-brand-error-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Deactivate Account</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Temporarily disable your account. You can reactivate it anytime by logging back in.
                  </p>
                  
                  {/* What Happens Section */}
                  <div className="mt-4 bg-muted rounded-xl p-4 border border-border">
                    <h4 className="text-sm font-medium text-foreground mb-3">What happens when you deactivate:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-brand-purple-600 dark:text-brand-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                        Your profile will be hidden from other users
                      </li>
                      <li className="flex items-start text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-brand-purple-600 dark:text-brand-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                        You will be logged out immediately
                      </li>
                      <li className="flex items-start text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-brand-purple-600 dark:text-brand-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                        Your data will be preserved and can be restored
                      </li>
                      <li className="flex items-start text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-brand-purple-600 dark:text-brand-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                        You can reactivate by logging in again
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeactivateModal(true)}
                      disabled={loading}
                      className="rounded-xl"
                    >
                      Deactivate Account
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Delete Account Section (Optional - for future) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-6"
        >
          <Card className="border-destructive/50 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-brand-error-50 dark:bg-brand-error-950 rounded-xl">
                  <Trash2 className="h-6 w-6 text-brand-error-600 dark:text-brand-error-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Delete Account</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mark your account for deletion. You can restore it by logging in within 30 days. After that, all data will be permanently deleted.
                  </p>
                  
                  {/* What Happens Section */}
                  <div className="mt-4 bg-muted rounded-xl p-4 border border-border">
                    <h4 className="text-sm font-medium text-foreground mb-3">What happens when you delete your account:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-brand-error-600 dark:text-brand-error-400 mr-2 mt-0.5 flex-shrink-0" />
                        Your account will be marked for deletion
                      </li>
                      <li className="flex items-start text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-brand-success-600 dark:text-brand-success-400 mr-2 mt-0.5 flex-shrink-0" />
                        You can restore it by logging in within 30 days
                      </li>
                      <li className="flex items-start text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-brand-error-600 dark:text-brand-error-400 mr-2 mt-0.5 flex-shrink-0" />
                        After 30 days, all data will be permanently deleted
                      </li>
                      <li className="flex items-start text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-brand-error-600 dark:text-brand-error-400 mr-2 mt-0.5 flex-shrink-0" />
                        You will be logged out immediately
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteModal(true)}
                      className="rounded-xl"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Deactivation Confirmation Modal */}
      <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-brand-error-50 dark:bg-brand-error-950 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-brand-error-600 dark:text-brand-error-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-foreground mb-2">
              Deactivate Your Account?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mb-6">
              Your account will be temporarily disabled. You can reactivate it anytime by logging back in.
            </DialogDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeactivateModal(false)}
              disabled={loading}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={loading}
              className="flex-1 rounded-xl"
            >
              {loading ? (
                <div className="flex items-center gap-2 w-full justify-center">
                  <Loading size="sm" text="Deactivating..." />
                </div>
              ) : 'Yes, Deactivate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountPopup 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
      />
    </div>
  )
}

export default AccountManagementPage
