// Tabs — wrapper over @base-ui/react Tabs primitives (Sprint 35-W.1).
// API mirrors shadcn Tabs for easy migration: <Tabs value=""><TabsList><TabsTrigger value="">
'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}

function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cn('flex flex-col gap-0', className)}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex items-center border-b border-stone-700 gap-0',
        className
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps extends React.ComponentProps<typeof TabsPrimitive.Tab> {
  value: string;
}

function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      value={value}
      className={cn(
        'px-4 py-2 text-sm text-stone-400 border-b-2 border-transparent -mb-px',
        'hover:text-stone-200 transition-colors',
        'data-[selected]:text-stone-100 data-[selected]:border-violet-500',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500',
        className
      )}
      {...props}
    />
  );
}

interface TabsContentProps extends React.ComponentProps<typeof TabsPrimitive.Panel> {
  value: string;
}

function TabsContent({ className, value, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Panel
      value={value}
      className={cn('flex-1 pt-4', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
