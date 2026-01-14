"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '../../store/hooks';
import { deactivateAccountThunk, deleteAccountAsync } from '../../store/slices/authSlice';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '../../components/ui/dialog';
import { Card, CardContent } from '../../components/ui/card';
import { AlertTriangle, Trash2, UserX, XCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const AccountDeactivationSection: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeactivate = async () => {
    setLoading(true);
    setError(null);
    try {
      await dispatch(deactivateAccountThunk()).unwrap();
      toast.success('Account deactivated successfully. Redirecting...');
      setDeactivateModalOpen(false);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined;
      setError(message || 'Failed to deactivate account.');
      toast.error(message || 'Failed to deactivate account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await dispatch(deleteAccountAsync()).unwrap();
      toast.success('Account deleted successfully. You can restore it by logging in within 30 days.');
      setDeleteModalOpen(false);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined;
      setError(message || 'Failed to delete account.');
      toast.error(message || 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deactivation-section space-y-6 max-w-4xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-foreground mb-6">Account Management</h2>
      
      {/* Deactivation Section */}
      <Card className="border-destructive/50 rounded-3xl">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-brand-error-50 dark:bg-brand-error-950 rounded-xl">
              <UserX className="h-6 w-6 text-brand-error-600 dark:text-brand-error-400" />
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
                <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" disabled={loading} className="rounded-xl">
                      Deactivate Account
                    </Button>
                  </DialogTrigger>
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
                        onClick={() => setDeactivateModalOpen(false)}
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
                        {loading ? 'Deactivating...' : 'Yes, Deactivate'}
                      </Button>
                    </div>
                    {error && <div className="text-brand-error-500 text-sm mt-3 text-center">{error}</div>}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Section */}
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
                <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" disabled={loading} className="rounded-xl">
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-3xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-4 bg-brand-error-50 dark:bg-brand-error-950 rounded-full mb-4">
                        <Trash2 className="h-8 w-8 text-brand-error-600 dark:text-brand-error-400" />
                      </div>
                      <DialogTitle className="text-xl font-semibold text-foreground mb-2">
                        Delete Your Account?
                      </DialogTitle>
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

                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setDeleteModalOpen(false)}
                        disabled={loading}
                        className="flex-1 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex-1 rounded-xl"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Deleting Account...</span>
                          </div>
                        ) : (
                          'Yes, Delete My Account'
                        )}
                      </Button>
                    </div>
                    {error && <div className="text-brand-error-500 text-sm mt-3 text-center">{error}</div>}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountDeactivationSection;

