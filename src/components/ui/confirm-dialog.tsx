// ConfirmDialog — modal dialog for confirm/cancel actions (Sprint 35-W.7).
// Replaces browser confirm() calls. Built on @base-ui/react Dialog.
'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-sm rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-2xl',
            'focus:outline-none'
          )}
        >
          <DialogPrimitive.Title className="text-sm font-semibold text-stone-100 mb-1">
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="text-sm text-stone-400 mb-4">
              {description}
            </DialogPrimitive.Description>
          )}
          <div className="flex items-center justify-end gap-2 mt-4">
            <DialogPrimitive.Close
              render={
                <Button variant="outline" size="sm">
                  {cancelLabel}
                </Button>
              }
            />
            <Button
              variant={destructive ? 'destructive' : 'default'}
              size="sm"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
