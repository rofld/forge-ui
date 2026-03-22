'use client';

import { useEffect, useState } from 'react';
import { listPools } from '@/lib/api';
import PoolCard from '@/components/pools/PoolCard';
import type { PoolInfo } from '@/lib/types';

export default function PoolsPage() {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listPools();
      setPools(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <h1 className="font-mono text-sm font-bold text-zinc-100">Pools</h1>
        <button
          onClick={load}
          className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          refresh
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="text-zinc-500 font-mono text-xs">Loading…</div>
        )}
        {error && (
          <div className="text-red-400 font-mono text-xs">
            Error: {error}
            <button onClick={load} className="ml-3 underline">retry</button>
          </div>
        )}
        {!loading && !error && pools.length === 0 && (
          <div className="text-zinc-600 font-mono text-xs">
            No active pools. Start a team with{' '}
            <code className="bg-zinc-900 px-1 rounded">shard --pool &lt;id&gt;</code>.
          </div>
        )}
        {pools.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((p) => (
              <PoolCard key={p.id} pool={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
