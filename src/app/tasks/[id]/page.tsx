'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getTask } from '@/lib/api';
import type { TaskRecord } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<string, string> = {
  running: 'bg-amber-500/20 text-amber-300 border-amber-500/20',
  completed: 'bg-green-500/20 text-green-300 border-green-500/20',
  failed: 'bg-red-500/20 text-red-300 border-red-500/20',
  pending: 'bg-stone-500/20 text-stone-300 border-stone-500/20',
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass border border-white/[0.06] rounded-lg px-4 py-3 text-center">
      <div className="text-[11px] text-stone-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg text-foreground font-mono mt-0.5">{value}</div>
    </div>
  );
}

export default function TaskDetailPage({ params }: Props) {
  const { id } = use(params);
  const [task, setTask] = useState<TaskRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTask(id).then(setTask).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  // Auto-refresh while running
  useEffect(() => {
    if (!task || (task.status !== 'running' && task.status !== 'pending')) return;
    const interval = setInterval(() => {
      getTask(id).then(setTask).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [id, task?.status]);

  if (loading) return <div className="p-6 text-stone-500">Loading...</div>;
  if (!task) return <div className="p-6 text-stone-500">Task not found</div>;

  const progress = task.max_iterations > 0
    ? Math.min((task.iterations_run / task.max_iterations) * 100, 100)
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tasks" className="text-stone-500 hover:text-stone-300 text-sm">
          &larr; Tasks
        </Link>
        <span className="text-stone-600">/</span>
        <span className="text-foreground font-mono text-sm">{task.id}</span>
        <span className={`px-2.5 py-1 rounded-md text-[12px] font-medium border ${STATUS_BADGE[task.status] || ''}`}>
          {task.status === 'running' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5 -translate-y-px" />
          )}
          {task.status}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Model" value={task.model} />
        <Metric label="Iterations" value={`${task.iterations_run}/${task.max_iterations}`} />
        <Metric label="Cost" value={`$${task.cost_usd.toFixed(4)}`} />
        <Metric label="Duration" value={elapsed(task.created_at, task.completed_at)} />
        <Metric label="Tokens" value={`${((task.input_tokens + task.output_tokens) / 1000).toFixed(1)}K`} />
      </div>

      {/* Progress bar (while running) */}
      {task.status === 'running' && (
        <div>
          <div className="flex justify-between text-[11px] text-stone-500 mb-1">
            <span>Progress</span>
            <span>{task.iterations_run} / {task.max_iterations} iterations</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500/60 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Prompt */}
      <div>
        <h2 className="text-sm text-stone-400 uppercase tracking-wider font-medium mb-2">Prompt</h2>
        <div className="glass border border-white/[0.06] rounded-lg p-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{task.prompt}</p>
        </div>
      </div>

      {/* Result */}
      {task.status === 'completed' && task.result && (
        <div>
          <h2 className="text-sm text-stone-400 uppercase tracking-wider font-medium mb-2">Result</h2>
          <div className="glass border border-green-500/10 rounded-lg p-4 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.result}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Error */}
      {task.status === 'failed' && task.error && (
        <div>
          <h2 className="text-sm text-stone-400 uppercase tracking-wider font-medium mb-2">Error</h2>
          <div className="glass border border-red-500/10 rounded-lg p-4">
            <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">{task.error}</pre>
          </div>
        </div>
      )}

      {/* Running state */}
      {task.status === 'running' && (
        <div className="glass border border-amber-500/10 rounded-lg p-8 text-center">
          <div className="inline-flex items-center gap-3 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm">Agent is working...</span>
          </div>
          <p className="text-[12px] text-stone-500 mt-2">
            Auto-refreshing every 3 seconds
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-stone-600 font-mono">
        {task.agent_id && <><span>Agent</span><span>{task.agent_id}</span></>}
        {task.persona && <><span>Persona</span><span>{task.persona}</span></>}
        {task.thread_id && <><span>Thread</span><span>{task.thread_id}</span></>}
        <span>Working dir</span><span>{task.working_dir}</span>
        <span>Done marker</span><span>{task.done_marker}</span>
        <span>Created</span><span>{task.created_at?.replace('T', ' ').slice(0, 19) || '—'}</span>
        {task.completed_at && <><span>Completed</span><span>{task.completed_at.replace('T', ' ').slice(0, 19)}</span></>}
      </div>
    </div>
  );
}
