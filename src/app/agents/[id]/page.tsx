'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAgent, getAgentStats, getAgentThreads, getThread, createThread, linkAgentThread } from '@/lib/api';
import type { AgentRecord, AgentStats } from '@/lib/api';
import type { ThreadInfo, ThreadDetail } from '@/lib/types';

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getAgent(id).then(setAgent).catch(() => null),
      getAgentStats(id).then(setStats).catch(() => null),
      loadThreads(),
    ]).finally(() => setLoading(false));
  }, [id]);

  async function loadThreads() {
    try {
      const threadIds = await getAgentThreads(id);
      const threadInfos = await Promise.all(
        threadIds.map(async (tid) => {
          try { return await getThread(tid); } catch { return null; }
        })
      );
      setThreads(threadInfos.filter((t): t is ThreadDetail => t !== null));
    } catch { /* ignore */ }
  }

  async function handleNewThread() {
    if (creating || !agent) return;
    setCreating(true);
    try {
      const thread = await createThread({ model: agent.model });
      await linkAgentThread(agent.id, thread.id);
      router.push(`/threads/${thread.id}?agent=${agent.id}`);
    } catch { /* ignore */ }
    setCreating(false);
  }

  if (loading) {
    return <div className="p-6 text-stone-500">Loading...</div>;
  }

  if (!agent) {
    return <div className="p-6 text-stone-500">Agent not found</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{agent.name}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {agent.persona ? `Persona: ${agent.persona}` : 'No persona'} · Model: {agent.model} · Owner: {agent.owner}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewThread}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/20 disabled:opacity-50"
          >
            {creating ? 'Creating...' : '+ New Thread'}
          </button>
          <button
            onClick={() => router.push(`/tasks?agent=${agent.id}`)}
            className="px-4 py-2 rounded-lg bg-white/[0.04] text-stone-300 text-sm font-medium hover:bg-white/[0.08] transition-colors border border-white/[0.08]"
          >
            Run Task
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Sessions', value: stats.total_sessions.toString() },
            { label: 'Input tokens', value: `${(stats.total_input_tokens / 1000).toFixed(1)}K` },
            { label: 'Output tokens', value: `${(stats.total_output_tokens / 1000).toFixed(1)}K` },
            { label: 'Cost', value: `$${stats.total_cost_usd.toFixed(4)}` },
          ].map((s) => (
            <div key={s.label} className="glass border border-white/[0.06] rounded-lg p-4 text-center">
              <div className="text-[11px] text-stone-500 uppercase tracking-wider">{s.label}</div>
              <div className="text-lg text-foreground font-mono mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Threads */}
      <div>
        <h2 className="text-sm text-stone-400 uppercase tracking-wider font-medium mb-3">Threads</h2>
        {threads.length === 0 ? (
          <div className="glass border border-white/[0.06] rounded-lg p-8 text-center text-stone-500">
            <p className="mb-2">No conversations yet</p>
            <p className="text-sm">Start a new thread to chat with this agent</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={`/threads/${t.id}?agent=${agent.id}`}
                className="flex items-center justify-between glass border border-white/[0.06] rounded-lg px-4 py-3 hover:border-white/[0.1] transition-colors group"
              >
                <div>
                  <span className="text-foreground text-sm font-medium">{t.id}</span>
                  <span className="text-stone-600 text-xs ml-3">{t.model}</span>
                </div>
                <div className="text-stone-600 text-xs font-mono">
                  {t.total_operations} ops · {((t.total_input_tokens + t.total_output_tokens) / 1000).toFixed(0)}K tok
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Agent metadata */}
      <div className="text-[11px] text-stone-600 font-mono">
        {agent.id} · created {agent.created_at?.replace('T', ' ').slice(0, 16)}
      </div>
    </div>
  );
}
