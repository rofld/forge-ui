'use client';

import { ReactNode } from 'react';
import { CanvasProvider, useCanvas } from '@/lib/canvas-context';
import { ThemeProvider } from '@/lib/theme-context';
import Canvas from '@/components/canvas/Canvas';

interface LayoutShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

function LayoutInner({ sidebar, children }: LayoutShellProps) {
  const { error } = useCanvas();

  return (
    <>
      {sidebar}
      <main className="flex-1 min-h-screen overflow-hidden flex flex-col relative">
        {children}
        {error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono animate-fade-in">
            {error}
          </div>
        )}
      </main>
      <Canvas />
    </>
  );
}

export default function LayoutShell({ sidebar, children }: LayoutShellProps) {
  return (
    <ThemeProvider>
      <CanvasProvider>
        <LayoutInner sidebar={sidebar}>{children}</LayoutInner>
      </CanvasProvider>
    </ThemeProvider>
  );
}
