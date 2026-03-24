'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPool } from '@/lib/api';
import HeartbeatGrid from '@/components/pools/HeartbeatGrid';
import SharedContext from '@/components/pools/SharedContext';
import WorkChatPanel from '@/components/pools/WorkChatPanel';
import type { PoolDetail } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default function PoolDetailPage({ params }: Props) {
  const { id } = use(params);

  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const data = await getPool(id);
        if (!cancelled) setPool(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 shrink-0 font-mono text-xs">
        <Link href="/pools" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Pools
        </Link>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-100 font-bold">{id}</span>
        {pool && (
          <>
            <span className="text-zinc-500">{pool.heartbeats.length} agents</span>
            <span className="text-amber-400">{pool.pending_tasks} pending</span>
            <span className="text-emerald-500">{pool.completed_tasks} done</span>
          </>
        )}
      </div>

      {loading && (
        <div className="p-6 text-zinc-600 font-mono text-xs">Loading…</div>
      )}
      {error && (
        <div className="p-6 text-red-400 font-mono text-xs">
          Error: {error}
          <button onClick={() => window.location.reload()} className="ml-3 underline">retry</button>
        </div>
      )}

      {pool && (
        <div className="p-4 space-y-6">
          {/* Agents */}
          <section>
            <h2 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider px-0 mb-2">
              Agents
            </h2>
            <div className="border border-zinc-800 rounded overflow-hidden">
              <HeartbeatGrid heartbeats={pool.heartbeats} />
            </div>
          </section>

          {/* WorkChat */}
          <section>
            <h2 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
              WorkChat
            </h2>
            <div className="border border-zinc-800 rounded overflow-hidden h-64">
              <WorkChatPanel poolId={id} />
            </div>
          </section>

          {/* Shared Context */}
          {pool.shared_context.length > 0 && (
            <section>
              <h2 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Shared Context
              </h2>
              <div className="border border-zinc-800 rounded overflow-hidden">
                <SharedContext entries={pool.shared_context} />
              </div>
            </section>
          )}

          {/* Briefing */}
          {pool.briefing && (
            <section>
              <h2 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Briefing
              </h2>
              <div className="border border-zinc-800 rounded p-4">
                <div className="prose prose-invert prose-sm max-w-none
                  prose-p:text-zinc-300 prose-p:my-1
                  prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:rounded prose-code:text-xs
                  prose-headings:text-zinc-100 prose-headings:font-mono
                  prose-li:text-zinc-300
                  prose-strong:text-zinc-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{pool.briefing}</ReactMarkdown>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
