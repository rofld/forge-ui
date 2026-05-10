'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listAgents, createAgent, deleteAgent, getAgentStats } from '@/lib/api';
import type { AgentRecord, AgentStats } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function StatusDot({ status }: { status: string }) {
  const color = {
    running: 'bg-green-400',
    pending: 'bg-amber-400',
    paused: 'bg-stone-400',
    stopped: 'bg-red-400',
  }[status] || 'bg-stone-600';

  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function AgentCard({ agent, stats, onDelete, onClick }: {
  agent: AgentRecord;
  stats?: AgentStats;
  onDelete: () => void;
  onClick: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div onClick={onClick} className="glass border border-white/[0.06] rounded-xl p-5 space-y-3 hover:border-amber-500/20 transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StatusDot status={agent.status} />
          <h3 className="text-foreground font-medium text-[15px]">{agent.name}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmOpen(true);
          }}
          className="text-stone-600 hover:text-red-400 transition-colors text-sm"
          title="Delete agent"
        >
          ×
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete agent?"
        description={`Are you sure you want to delete agent "${agent.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { onDelete(); setConfirmOpen(false); }}
      />


      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
        <span className="text-stone-500">Owner</span>
        <span className="text-stone-300">{agent.owner}</span>
        <span className="text-stone-500">Model</span>
        <span className="text-stone-300 font-mono">{agent.model}</span>
        <span className="text-stone-500">Persona</span>
        <span className="text-stone-300 font-mono">{agent.persona || '—'}</span>
        <span className="text-stone-500">Status</span>
        <span className="text-stone-300">{agent.status}</span>
      </div>

      {stats && stats.total_sessions > 0 && (
        <div className="pt-2 border-t border-white/[0.04] grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[11px] text-stone-500">Sessions</div>
            <div className="text-sm text-stone-300 font-mono">{stats.total_sessions}</div>
          </div>
          <div>
            <div className="text-[11px] text-stone-500">Tokens</div>
            <div className="text-sm text-stone-300 font-mono">
              {((stats.total_input_tokens + stats.total_output_tokens) / 1000).toFixed(0)}K
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-500">Cost</div>
            <div className="text-sm text-stone-300 font-mono">
              ${stats.total_cost_usd.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <div className="text-[11px] text-stone-600 font-mono">
        {agent.id} · {agent.created_at?.replace('T', ' ').slice(0, 16) || ''}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [stats, setStats] = useState<Record<string, AgentStats>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', owner: '', model: 'sonnet', persona: '' });
  const [creating, setCreating] = useState(false);

  const loadAgents = async () => {
    try {
      const list = await listAgents();
      setAgents(list);
      // Load stats for each
      const statsMap: Record<string, AgentStats> = {};
      await Promise.all(list.map(async (a) => {
        try {
          statsMap[a.id] = await getAgentStats(a.id);
        } catch { /* ignore */ }
      }));
      setStats(statsMap);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadAgents(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating || !form.name.trim() || !form.owner.trim()) return;
    setCreating(true);
    try {
      await createAgent({
        name: form.name.trim(),
        owner: form.owner.trim(),
        model: form.model || 'sonnet',
        persona: form.persona.trim() || undefined,
      });
      setForm({ name: '', owner: '', model: 'sonnet', persona: '' });
      setShowCreate(false);
      await loadAgents();
    } catch { /* ignore */ }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Agents</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/20"
        >
          {showCreate ? 'Cancel' : '+ New Agent'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. raf-claw"
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Owner</label>
              <input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="e.g. raf"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Model</label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40"
              >
                <option value="opus">Opus</option>
                <option value="sonnet">Sonnet</option>
                <option value="haiku">Haiku</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Persona</label>
              <input
                value={form.persona}
                onChange={(e) => setForm({ ...form, persona: e.target.value })}
                placeholder="e.g. raf-claw (from ~/.agents/)"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/20 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Agent'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((a) => (
          <AgentCard
            key={a.id}
            agent={a}
            stats={stats[a.id]}
            onDelete={() => handleDelete(a.id)}
            onClick={() => router.push(`/agents/${a.id}`)}
          />
        ))}
      </div>

      {agents.length === 0 && !showCreate && (
        <div className="text-center py-16 text-stone-500">
          <p className="text-lg mb-2">No agents provisioned</p>
          <p className="text-sm">Create your first claw agent to get started</p>
        </div>
      )}
    </div>
  );
}
