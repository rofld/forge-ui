// Drawer — right-edge slide-out panel built on @base-ui/react Drawer (Sprint 35-W.1).
// API: <Drawer open={...} onOpenChange={...}><DrawerContent>...</DrawerContent></Drawer>
'use client';

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/** Root — controls open state. Wraps base-ui DrawerRoot. */
function Drawer({ open, onOpenChange, children }: DrawerProps) {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DrawerPrimitive.Root>
  );
}

/** The sliding panel itself — right-anchored, 30vw default. */
function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Popup>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
      <DrawerPrimitive.Popup
        className={cn(
          'fixed right-0 top-0 h-full w-[30vw] min-w-[300px] max-w-[600px] z-50',
          'bg-stone-900 border-l border-stone-700 shadow-2xl',
          'flex flex-col overflow-hidden',
          'data-[open]:animate-in data-[open]:slide-in-from-right',
          'data-[closed]:animate-out data-[closed]:slide-out-to-right',
          'duration-200 ease-out',
          className
        )}
        {...props}
      >
        {children}
      </DrawerPrimitive.Popup>
    </DrawerPrimitive.Portal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0',
        className
      )}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-sm font-semibold text-stone-100', className)}
      {...props}
    />
  );
}

function DrawerBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-4', className)} {...props} />
  );
}

function DrawerClose({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return (
    <DrawerPrimitive.Close
      className={cn(
        'rounded p-1 text-stone-500 hover:text-stone-200 hover:bg-stone-700 transition-colors',
        className
      )}
      {...props}
    />
  );
}

export { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody, DrawerClose };
