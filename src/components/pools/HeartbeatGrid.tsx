'use client';

import StatusDot from '@/components/ui/StatusDot';
import { formatTokens, estimateCost, formatCost } from '@/lib/format';
import type { HeartbeatEntry } from '@/lib/types';

interface HeartbeatGridProps {
  heartbeats: HeartbeatEntry[];
}

function agentStatus(h: HeartbeatEntry): 'working' | 'idle' | 'offline' {
  if (!h.ts) return 'offline';
  const age = Date.now() - new Date(h.ts).getTime();
  if (age > 60_000) return 'offline';
  if (h.task) return 'working';
  return 'idle';
}

export default function HeartbeatGrid({ heartbeats }: HeartbeatGridProps) {
  if (heartbeats.length === 0) {
    return (
      <div className="p-4 text-zinc-600 font-mono text-xs">No agents connected.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
      {heartbeats.map((h) => {
        const status = agentStatus(h);
        const tokens = h.tokens ?? 0;
        const cost = estimateCost('claude-opus-4-6', tokens * 0.7, tokens * 0.3, 0);

        return (
          <div
            key={h.agent}
            className="bg-zinc-900 border border-zinc-800 rounded p-3 font-mono"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-200 font-bold">{h.agent}</span>
              <StatusDot status={status} showLabel />
            </div>

            {h.task && (
              <div className="text-xs text-zinc-400 mb-2 truncate">
                <span className="text-zinc-600">task: </span>
                {h.task}
              </div>
            )}

            <div className="flex gap-3 text-xs text-zinc-500">
              <span>{formatTokens(tokens)} tok</span>
              <span className="text-emerald-700">{formatCost(cost)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
