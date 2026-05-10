// Toaster — thin wrapper around sonner for toast notifications (Sprint 35-W.7).
// Re-exports toast helpers so callers import from @/components/ui/toaster.
'use client';

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

/** Drop this into the root layout once. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'bg-stone-900 border border-stone-700 text-stone-100 rounded-lg shadow-lg text-sm',
          title: 'font-medium',
          description: 'text-stone-400',
          actionButton: 'bg-violet-600 text-white rounded px-2 py-0.5 text-xs',
          cancelButton: 'bg-stone-700 text-stone-200 rounded px-2 py-0.5 text-xs',
          closeButton: 'text-stone-500 hover:text-stone-300',
          error: 'border-red-500/40',
          success: 'border-green-500/40',
          warning: 'border-yellow-500/40',
          info: 'border-blue-500/40',
        },
      }}
    />
  );
}

/** Typed toast helpers — import { toast } from '@/components/ui/toaster'. */
export const toast = {
  success: (msg: string, opts?: Parameters<typeof sonnerToast.success>[1]) =>
    sonnerToast.success(msg, opts),
  error: (msg: string, opts?: Parameters<typeof sonnerToast.error>[1]) =>
    sonnerToast.error(msg, opts),
  info: (msg: string, opts?: Parameters<typeof sonnerToast.info>[1]) =>
    sonnerToast.info(msg, opts),
  warning: (msg: string, opts?: Parameters<typeof sonnerToast.warning>[1]) =>
    sonnerToast.warning(msg, opts),
  /** Raw passthrough for advanced cases. */
  raw: sonnerToast,
};
