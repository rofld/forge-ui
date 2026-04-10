'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { getTask, deleteTask, readFile, taskStreamUrl } from '@/lib/api';
import type { TaskRecord } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  params: Promise<{ id: string }>;
}

interface TaskEvent {
  type: string;
  name?: string;
  input?: string;
  output?: string;
  text?: string;
  model?: string;
  is_error?: boolean;
  duration_ms?: number;
  iteration?: number;
  max?: number;
  tool_calls?: { name: string; input: string }[];
  stop_reason?: string;
  error?: string | null;
  status?: string;
  result?: string | null;
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

function EventItem({ event }: { event: TaskEvent }) {
  if (event.type === 'iteration_start') {
    return (
      <div className="flex items-center gap-2 text-[12px] text-amber-400/70 font-mono py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
        Iteration {event.iteration}/{event.max}
      </div>
    );
  }
  if (event.type === 'tool_start') {
    return (
      <div className="border-l-2 border-amber-500/30 pl-3 py-1">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-amber-300 font-mono font-medium">{event.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>
        {event.input && (
          <pre className="text-[11px] text-stone-500 mt-0.5 whitespace-pre-wrap max-h-20 overflow-hidden">{event.input}</pre>
        )}
      </div>
    );
  }
  if (event.type === 'tool_end') {
    return (
      <div className={`border-l-2 ${event.is_error ? 'border-red-500/30' : 'border-green-500/30'} pl-3 py-1`}>
        <div className="flex items-center gap-2 text-[12px]">
          <span className={`font-mono font-medium ${event.is_error ? 'text-red-300' : 'text-green-300'}`}>{event.name}</span>
          {event.duration_ms != null && (
            <span className="text-stone-600 text-[10px]">{event.duration_ms}ms</span>
          )}
        </div>
        {event.output && (
          <pre className="text-[11px] text-stone-500 mt-0.5 whitespace-pre-wrap max-h-32 overflow-y-auto">{event.output}</pre>
        )}
      </div>
    );
  }
  if (event.type === 'assistant') {
    return (
      <div className="py-1">
        {event.text && (
          <div className="text-sm text-foreground/80 whitespace-pre-wrap">{event.text.slice(0, 500)}{event.text.length > 500 ? '...' : ''}</div>
        )}
        {event.tool_calls && event.tool_calls.length > 0 && (
          <div className="text-[11px] text-stone-500 mt-1">
            Tools: {event.tool_calls.map(t => t.name).join(', ')}
          </div>
        )}
      </div>
    );
  }
  if (event.type === 'agent_end') {
    return (
      <div className="text-[12px] text-stone-500 py-1 font-mono">
        {event.error ? `Error: ${event.error}` : 'Agent iteration complete'}
      </div>
    );
  }
  return null;
}

export default function TaskDetailPage({ params }: Props) {
  const { id } = use(params);
  const [task, setTask] = useState<TaskRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const [fileContent, setFileContent] = useState<{ path: string; content: string; language: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load task
  useEffect(() => {
    getTask(id).then(setTask).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  // Connect to SSE stream when task is running
  useEffect(() => {
    if (!task || (task.status !== 'running' && task.status !== 'pending')) return;

    const url = taskStreamUrl(id);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('task_event', (e) => {
      try {
        const event: TaskEvent = JSON.parse(e.data);
        setEvents(prev => [...prev, event]);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('task_done', () => {
      // Refresh task data
      getTask(id).then(setTask).catch(() => {});
      es.close();
    });

    es.onerror = () => {
      // Reconnect on error — just refresh task
      setTimeout(() => {
        getTask(id).then(setTask).catch(() => {});
      }, 2000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [id, task?.status]);

  // Auto-refresh while running (fallback for metrics)
  useEffect(() => {
    if (!task || (task.status !== 'running' && task.status !== 'pending')) return;
    const interval = setInterval(() => {
      getTask(id).then(setTask).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [id, task?.status]);

  // Auto-scroll event log
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const handleCancel = async () => {
    if (cancelling || !task) return;
    setCancelling(true);
    try {
      await deleteTask(id);
      const updated = await getTask(id);
      setTask(updated);
    } catch { /* ignore */ }
    setCancelling(false);
  };

  const handleViewFile = async (path: string) => {
    setFileLoading(true);
    try {
      const file = await readFile(path);
      setFileContent(file);
    } catch { /* ignore */ }
    setFileLoading(false);
  };

  // Extract file paths from result text
  const extractFilePaths = (text: string): string[] => {
    const matches = text.match(/\/[\w/._-]+\.\w+/g) || [];
    return [...new Set(matches)].filter(p => !p.includes('..') && p.length > 3);
  };

  if (loading) return <div className="p-6 text-stone-500">Loading...</div>;
  if (!task) return <div className="p-6 text-stone-500">Task not found</div>;

  const progress = task.max_iterations > 0
    ? Math.min((task.iterations_run / task.max_iterations) * 100, 100)
    : 0;

  const filePaths = task.result ? extractFilePaths(task.result) : [];

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
        <div className="flex-1" />
        {(task.status === 'running' || task.status === 'pending') && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-colors border border-red-500/20 disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        )}
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

      {/* Live Event Log (while running or has events) */}
      {events.length > 0 && (
        <div>
          <h2 className="text-sm text-stone-400 uppercase tracking-wider font-medium mb-2">
            Live Activity
            {task.status === 'running' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-2 -translate-y-px" />
            )}
          </h2>
          <div className="glass border border-white/[0.06] rounded-lg p-4 max-h-96 overflow-y-auto space-y-1">
            {events.map((event, i) => (
              <EventItem key={i} event={event} />
            ))}
            <div ref={eventsEndRef} />
          </div>
        </div>
      )}

      {/* Running state (only when no events yet) */}
      {task.status === 'running' && events.length === 0 && (
        <div className="glass border border-amber-500/10 rounded-lg p-8 text-center">
          <div className="inline-flex items-center gap-3 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm">Connecting to agent stream...</span>
          </div>
        </div>
      )}

      {/* Result */}
      {task.status === 'completed' && task.result && (
        <div>
          <h2 className="text-sm text-stone-400 uppercase tracking-wider font-medium mb-2">Result</h2>
          <div className="glass border border-green-500/10 rounded-lg p-4 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.result}</ReactMarkdown>
          </div>

          {/* File paths found in result */}
          {filePaths.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filePaths.slice(0, 5).map((path) => (
                <button
                  key={path}
                  onClick={() => handleViewFile(path)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-stone-400 text-[12px] font-mono hover:bg-white/[0.08] hover:text-stone-200 transition-colors border border-white/[0.08]"
                >
                  View {path.split('/').pop()}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Viewer */}
      {fileContent && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm text-stone-400 uppercase tracking-wider font-medium">
              {fileContent.path}
            </h2>
            <button
              onClick={() => setFileContent(null)}
              className="text-stone-500 hover:text-stone-300 text-sm"
            >
              Close
            </button>
          </div>
          <div className="glass border border-white/[0.06] rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-foreground font-mono whitespace-pre-wrap">{fileContent.content}</pre>
          </div>
        </div>
      )}
      {fileLoading && (
        <div className="text-stone-500 text-sm">Loading file...</div>
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
