'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { listTasks, createTask, listAgents } from '@/lib/api';
import type { TaskRecord, AgentRecord } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  running: 'border-l-amber-500 bg-amber-500/[0.03]',
  completed: 'border-l-green-500',
  failed: 'border-l-red-500',
  pending: 'border-l-stone-500',
};

const STATUS_DOT: Record<string, string> = {
  running: 'bg-amber-400 animate-pulse',
  completed: 'bg-green-400',
  failed: 'bg-red-400',
  pending: 'bg-stone-500',
};

function elapsed(created: string | null, completed: string | null): string {
  if (!created) return '—';
  const start = new Date(created).getTime();
  const end = completed ? new Date(completed).getTime() : Date.now();
  const secs = Math.floor((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass border border-white/[0.06] rounded-lg px-4 py-3 text-center flex-1 min-w-[120px]">
      <div className="text-[11px] text-stone-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg text-foreground font-mono mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-stone-600 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAgent = searchParams.get('agent') || '';

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(!!preselectedAgent);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    prompt: '',
    agent_id: preselectedAgent,
    done_marker: '[COMPLETE]',
    max_iterations: '20',
    working_dir: '/tmp',
  });

  const loadTasks = useCallback(async () => {
    try {
      const all = await listTasks();
      setTasks(all);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadTasks();
    listAgents().then(setAgents).catch(() => {});
  }, [loadTasks]);

  // Auto-refresh while any task is running
  useEffect(() => {
    const hasRunning = tasks.some((t) => t.status === 'running' || t.status === 'pending');
    if (!hasRunning) return;
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [tasks, loadTasks]);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const stats = {
    running: tasks.filter((t) => t.status === 'running').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
    totalCost: tasks.reduce((sum, t) => sum + t.cost_usd, 0),
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating || !form.prompt.trim()) return;
    setCreating(true);
    try {
      await createTask({
        prompt: form.prompt.trim(),
        agent_id: form.agent_id || undefined,
        done_marker: form.done_marker || '[COMPLETE]',
        max_iterations: parseInt(form.max_iterations) || 20,
        working_dir: form.working_dir || '/tmp',
      });
      setForm({ ...form, prompt: '' });
      setShowCreate(false);
      await loadTasks();
    } catch { /* ignore */ }
    setCreating(false);
  };

  const agentName = (id: string | null) => {
    if (!id) return null;
    return agents.find((a) => a.id === id)?.name || id;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/20"
        >
          {showCreate ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="Running" value={String(stats.running)} />
        <StatCard label="Completed" value={String(stats.completed)} />
        <StatCard label="Failed" value={String(stats.failed)} />
        <StatCard label="Total Cost" value={`$${stats.totalCost.toFixed(2)}`} />
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="glass border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1">Prompt</label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder="Describe the task. The agent will work autonomously until it outputs the done marker."
              rows={3}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[12px] text-stone-500 mb-1">Agent</label>
              <select
                value={form.agent_id}
                onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40"
              >
                <option value="">No agent (default model)</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-stone-500 mb-1">Done Marker</label>
              <input
                value={form.done_marker}
                onChange={(e) => setForm({ ...form, done_marker: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-[12px] text-stone-500 mb-1">Max Iterations</label>
              <input
                type="number"
                value={form.max_iterations}
                onChange={(e) => setForm({ ...form, max_iterations: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-[12px] text-stone-500 mb-1">Working Dir</label>
              <input
                value={form.working_dir}
                onChange={(e) => setForm({ ...form, working_dir: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm outline-none focus:border-amber-500/40"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !form.prompt.trim()}
            className="px-6 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/20 disabled:opacity-50"
          >
            {creating ? 'Submitting...' : 'Run Task'}
          </button>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1">
        {['all', 'running', 'completed', 'failed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              filter === s
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span className="ml-1.5 text-[11px] opacity-60">
                {tasks.filter((t) => t.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
        {filtered.map((t) => (
          <div
            key={t.id}
            onClick={() => router.push(`/tasks/${t.id}`)}
            className={`glass border border-white/[0.06] border-l-[3px] rounded-lg p-4 cursor-pointer hover:border-white/[0.1] transition-colors ${STATUS_COLORS[t.status] || ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[t.status] || 'bg-stone-600'}`} />
                <span className="text-[12px] text-stone-500 font-mono">{t.id}</span>
              </div>
              {agentName(t.agent_id) && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-white/[0.06] text-stone-400">
                  {agentName(t.agent_id)}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground line-clamp-2 mb-3">{t.prompt}</p>
            <div className="flex items-center gap-4 text-[11px] text-stone-500 font-mono">
              <span>{t.iterations_run}/{t.max_iterations} iter</span>
              <span>${t.cost_usd.toFixed(4)}</span>
              <span>{elapsed(t.created_at, t.completed_at)}</span>
              <span className="text-stone-600">{t.model}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <p className="text-lg mb-2">{filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}</p>
          <p className="text-sm">Submit a task and watch it run autonomously</p>
        </div>
      )}
    </div>
  );
}
