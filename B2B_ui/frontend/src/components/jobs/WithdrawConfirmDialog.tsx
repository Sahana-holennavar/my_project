'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface WithdrawConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jobTitle: string;
  companyName?: string;
  loading?: boolean;
}

export function WithdrawConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
  companyName,
  loading = false,
}: WithdrawConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            Withdraw Application?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Are you sure you want to withdraw your application for{' '}
            <span className="font-semibold text-neutral-900 dark:text-white">{jobTitle}</span>
            {companyName && (
              <>
                {' '}at <span className="font-semibold text-neutral-900 dark:text-white">{companyName}</span>
              </>
            )}
            ? This action cannot be undone.
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            You can apply again later if you change your mind.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Withdrawing...
              </>
            ) : (
              'Withdraw'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

