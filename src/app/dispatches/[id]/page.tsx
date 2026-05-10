// /dispatches/[id]/page.tsx — Server component.
// Fetches the dispatch server-side then hands off to the client DispatchDetail component.
import { notFound } from 'next/navigation';
import { DispatchDetail } from '@/components/dispatch-detail';
import type { Dispatch } from '@/lib/api';

const API_BASE =
  process.env.NEXT_PUBLIC_FORGE_API ?? 'http://localhost:3142';

/** Server-side fetch — no auth token (SSR context, cookie-less fallback). */
async function fetchDispatch(id: string): Promise<Dispatch | null> {
  try {
    const res = await fetch(`${API_BASE}/dispatches/${encodeURIComponent(id)}`, {
      // Revalidate every 10 s so the page refreshes on revisit without a full redeploy.
      next: { revalidate: 10 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as Dispatch;
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DispatchPage({ params }: PageProps) {
  const { id } = await params;
  const dispatch = await fetchDispatch(id);
  if (!dispatch) notFound();
  return <DispatchDetail dispatch={dispatch} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const dispatch = await fetchDispatch(id);
  return {
    title: dispatch ? `${dispatch.title} — Dispatch` : `Dispatch ${id}`,
  };
}
