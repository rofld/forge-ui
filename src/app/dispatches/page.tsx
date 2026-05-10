// Dispatches kanban page — Sprint 35-W.2.
// Server component: fetches initial dispatch list server-side, passes to client board.
// The client board handles DnD, optimistic updates, auto-refresh, and multi-select.
import { Suspense } from 'react';
import { DispatchesBoard } from '@/components/dispatches-board';
import type { Dispatch } from '@/lib/api';

export const metadata = {
  title: 'Dispatches — Forge UI',
};

/** Attempt a server-side prefetch; on failure (backend unavailable) return empty. */
async function fetchDispatchesServer(): Promise<Dispatch[]> {
  const apiBase = process.env.NEXT_PUBLIC_FORGE_API ?? 'http://localhost:3142';
  try {
    const res = await fetch(`${apiBase}/dispatches`, {
      // Revalidate frequently so the initial paint is reasonably fresh.
      next: { revalidate: 5 },
    });
    if (!res.ok) return [];
    return res.json() as Promise<Dispatch[]>;
  } catch {
    return [];
  }
}

export default async function DispatchesPage() {
  const initial = await fetchDispatchesServer();

  return (
    <div className="flex flex-col h-full p-6 gap-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dispatches</h1>
          <p className="text-[12px] text-stone-500 mt-0.5">
            Kanban view of agent dispatch tasks · drag to transition · Shift+click to multi-select
          </p>
        </div>
      </div>

      {/* Board */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1 text-stone-500 text-sm">
            Loading dispatches…
          </div>
        }
      >
        <DispatchesBoard initial={initial} />
      </Suspense>
    </div>
  );
}
