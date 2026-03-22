import Link from 'next/link';
import StatusDot from '@/components/ui/StatusDot';
import type { PoolInfo } from '@/lib/types';

interface PoolCardProps {
  pool: PoolInfo;
}

export default function PoolCard({ pool }: PoolCardProps) {
  const hasAgents = pool.agent_count > 0;

  return (
    <Link
      href={`/pools/${pool.id}`}
      className="block bg-zinc-900 border border-zinc-800 rounded p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm text-zinc-100 font-bold">{pool.id}</span>
        <StatusDot status={hasAgents ? 'working' : 'offline'} showLabel />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs font-mono text-zinc-500">
        <div>
          <div className="text-zinc-300 text-sm font-bold">{pool.agent_count}</div>
          <div>agents</div>
        </div>
        <div>
          <div className="text-amber-400 text-sm font-bold">{pool.pending_tasks}</div>
          <div>pending</div>
        </div>
        <div>
          <div className="text-emerald-500 text-sm font-bold">{pool.completed_tasks}</div>
          <div>done</div>
        </div>
      </div>
    </Link>
  );
}
