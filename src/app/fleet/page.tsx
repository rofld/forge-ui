// fleet/page.tsx — Fleet Heartbeats page.
// Client component: polls GET /fleet/heartbeats every 5s and renders HeartbeatGrid.
// Also shows a CostTicker stub (GET /fleet/cost?since=today not yet implemented server-side).
'use client';

import { useEffect, useState, useCallback } from 'react';
import HeartbeatGrid from '@/components/pools/HeartbeatGrid';
import type { HeartbeatEntry } from '@/lib/types';
import { formatCost } from '@/lib/format';

const API_BASE =
  process.env.NEXT_PUBLIC_FORGE_API || 'http://localhost:3142';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('forge_token');
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchHeartbeats(): Promise<HeartbeatEntry[]> {
  const res = await fetch(`${API_BASE}/fleet/heartbeats`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    cache: 'no-store',
  });
  if (res.status === 401) {
    localStorage.removeItem('forge_token');
    window.location.href = '/login';
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${body}`);
  }
  const text = await res.text();
  if (!text) return [];
  const data = JSON.parse(text);
  // Accept either a bare array or { heartbeats: [...] }
  return Array.isArray(data) ? data : (data.heartbeats ?? []);
}

// TODO: wire to GET /fleet/cost?since=today when that endpoint exists server-side.
// For now returns 0 (stub) and logs a warning so it's easy to find.
async function fetchDailyCost(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/fleet/cost?since=today`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      cache: 'no-store',
    });
    if (!res.ok) return 0; // endpoint not yet implemented — fall through to stub
    const data = await res.json();
    return typeof data.total_usd === 'number' ? data.total_usd : 0;
  } catch {
    return 0; // stub: /fleet/cost not yet implemented
  }
}

interface CostTickerProps {
  totalUsd: number;
}

function CostTicker({ totalUsd }: CostTickerProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-400">
      <span className="text-zinc-600 uppercase tracking-widest">Cost today</span>
      <span className="text-emerald-400 font-bold">{formatCost(totalUsd)}</span>
      {totalUsd === 0 && (
        <span className="text-zinc-700 italic">
          {/* TODO: /fleet/cost?since=today not yet implemented */}
          (stub — endpoint pending)
        </span>
      )}
    </div>
  );
}

export default function FleetPage() {
  const [heartbeats, setHeartbeats] = useState<HeartbeatEntry[]>([]);
  const [dailyCost, setDailyCost] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [hb, cost] = await Promise.all([fetchHeartbeats(), fetchDailyCost()]);
      setHeartbeats(hb);
      setDailyCost(cost);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Initial load + 5s auto-refresh
  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Fleet Heartbeats
          </h1>
          {lastRefresh && (
            <p className="text-xs text-zinc-600 font-mono mt-0.5">
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={() => void refresh()}
          className="text-xs text-zinc-500 hover:text-amber-400 font-mono transition-colors px-2 py-1 rounded hover:bg-zinc-800"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2 font-mono">
          {error}
        </div>
      )}

      {/* Heartbeat grid */}
      <div className="flex-1">
        <HeartbeatGrid heartbeats={heartbeats} />
      </div>

      {/* Cost burn ticker */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <CostTicker totalUsd={dailyCost} />
      </div>
    </div>
  );
}
