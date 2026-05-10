// dispatch-detail.tsx — Client component for /dispatches/[id].
// Header (title, status badge, assignee, back link) + 4 tabs:
//   Events   — live SSE feed via useEventStream
//   Diff     — PR/diff preview via DiffViewer
//   Acceptance — last acceptance run result
//   Agent logs — live log stream via LogStreamPane + useEventStream
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DiffViewer } from '@/components/diff-viewer';
import { LogStreamPane } from '@/components/log-stream-pane';
import { useEventStream } from '@/lib/use-event-stream';
import {
  getDispatchAcceptance,
  dispatchStreamUrl,
  agentLogsStreamUrl,
} from '@/lib/api';
import type { Dispatch, DispatchAcceptance } from '@/lib/api';

// ── Status badge helpers ────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  triage:   'bg-stone-500/20 text-stone-300 border-stone-500/30',
  todo:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ready:    'bg-violet-500/20 text-violet-300 border-violet-500/30',
  running:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  blocked:  'bg-red-500/20 text-red-300 border-red-500/30',
  done:     'bg-green-500/20 text-green-300 border-green-500/30',
  archived: 'bg-stone-700/40 text-stone-500 border-stone-600/30',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? 'bg-stone-500/20 text-stone-300 border-stone-500/30';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {status}
    </span>
  );
}

// ── Dispatch event shape ────────────────────────────────────────────────────

interface DispatchEvent {
  ts?: string | number;
  kind?: string;
  type?: string;
  [key: string]: unknown;
}

function formatTs(ev: DispatchEvent): string {
  const raw = ev.ts;
  if (!raw) return '--:--:--';
  const d = typeof raw === 'number' ? new Date(raw * 1000) : new Date(raw as string);
  if (isNaN(d.getTime())) return String(raw).slice(0, 19);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

function eventKind(ev: DispatchEvent): string {
  return (ev.kind ?? ev.type ?? 'event') as string;
}

function eventSummary(ev: DispatchEvent): string {
  // Extract a short payload summary — skip ts/kind/type keys.
  const skip = new Set(['ts', 'kind', 'type']);
  const pairs = Object.entries(ev)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => {
      const vs = typeof v === 'string' ? v : JSON.stringify(v);
      return `${k}=${vs.length > 60 ? vs.slice(0, 57) + '…' : vs}`;
    });
  return pairs.slice(0, 3).join('  ') || '{}';
}

// ── EventsTab ───────────────────────────────────────────────────────────────

function EventsTab({ dispatchId }: { dispatchId: string }) {
  const url = dispatchStreamUrl(dispatchId);
  const { events, connected } = useEventStream<DispatchEvent>(url);

  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    if (pinnedRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            connected ? 'bg-green-400 animate-pulse' : 'bg-stone-600'
          }`}
        />
        <span className="text-[11px] font-mono text-stone-500">
          {connected ? 'live' : 'disconnected'} · {events.length} events
        </span>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-[12px] space-y-0.5 pr-1"
      >
        {events.length === 0 ? (
          <span className="text-stone-600 italic">
            {connected ? 'Waiting for events…' : 'No events yet.'}
          </span>
        ) : (
          events.map((ev, i) => (
            <div
              key={i}
              className="flex gap-3 items-baseline py-0.5 border-b border-white/[0.03] hover:bg-white/[0.02] rounded px-1"
            >
              <span className="text-stone-600 shrink-0 w-20">{formatTs(ev)}</span>
              <span className="text-violet-400 shrink-0 w-28 truncate">{eventKind(ev)}</span>
              <span className="text-stone-400 truncate">{eventSummary(ev)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── DiffTab ─────────────────────────────────────────────────────────────────

interface DiffTabProps {
  prUrl?: string | null;
  diffPath?: string | null;
}

function DiffTab({ prUrl, diffPath }: DiffTabProps) {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchDiff = useCallback(async (url: string) => {
    setLoading(true);
    setErr(null);
    try {
      // For PR URLs pointing to GitHub, append .diff for the raw diff format
      const fetchUrl = url.includes('github.com') && !url.endsWith('.diff')
        ? `${url}.diff`
        : url;
      const res = await fetch(fetchUrl, { headers: { Accept: 'text/plain' } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setDiff(await res.text());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (prUrl) fetchDiff(prUrl);
    else if (diffPath) fetchDiff(diffPath);
  }, [prUrl, diffPath, fetchDiff]);

  if (!prUrl && !diffPath) {
    return (
      <div className="text-stone-500 italic text-sm py-6 text-center">
        (no diff yet — dispatch has not opened a PR)
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-stone-500 text-sm py-6 text-center animate-pulse">
        Loading diff…
      </div>
    );
  }

  if (err) {
    return (
      <div className="text-red-400 text-sm py-6 text-center">
        Failed to fetch diff: {err}
        {prUrl && (
          <div className="mt-2">
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-violet-400 hover:text-violet-300"
            >
              View PR on GitHub
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col gap-2">
      {prUrl && (
        <div className="text-[12px] text-stone-500">
          Source:{' '}
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-violet-400 hover:text-violet-300"
          >
            {prUrl}
          </a>
        </div>
      )}
      <DiffViewer diff={diff ?? ''} className="flex-1 min-h-0" />
    </div>
  );
}

// ── AcceptanceTab ───────────────────────────────────────────────────────────

function AcceptanceTab({ dispatchId }: { dispatchId: string }) {
  const [result, setResult] = useState<DispatchAcceptance | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDispatchAcceptance(dispatchId)
      .then(setResult)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [dispatchId]);

  if (loading) {
    return <div className="text-stone-500 text-sm py-6 text-center animate-pulse">Loading…</div>;
  }
  if (err) {
    return <div className="text-red-400 text-sm py-4">Error: {err}</div>;
  }
  if (!result) {
    return (
      <div className="text-stone-500 italic text-sm py-6 text-center">
        (no acceptance run yet)
      </div>
    );
  }

  const passedLabel =
    result.passed === null ? 'N/A' : result.passed ? 'PASSED' : 'FAILED';
  const passedClass =
    result.passed === null
      ? 'text-stone-400'
      : result.passed
      ? 'text-green-400'
      : 'text-red-400';

  return (
    <div className="space-y-4 font-mono text-[13px]">
      <div className="flex items-center gap-3">
        <span className="text-stone-500">Result:</span>
        <span className={`font-bold ${passedClass}`}>{passedLabel}</span>
        {result.exit_code !== null && (
          <span className="text-stone-600 text-[11px]">
            (exit {result.exit_code})
          </span>
        )}
      </div>
      {result.command && (
        <div>
          <div className="text-[11px] text-stone-500 uppercase tracking-wider mb-1">Command</div>
          <code className="block text-xs text-stone-300 bg-black/30 rounded px-3 py-2 whitespace-pre-wrap break-all">
            {result.command}
          </code>
        </div>
      )}
      {result.output && (
        <div>
          <div className="text-[11px] text-stone-500 uppercase tracking-wider mb-1">Output</div>
          <pre className="text-xs text-stone-300 bg-black/30 rounded px-3 py-2 overflow-auto max-h-96 whitespace-pre-wrap break-all">
            {result.output}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── AgentLogsTab ────────────────────────────────────────────────────────────

function AgentLogsTab({ agentId }: { agentId: string }) {
  const url = agentLogsStreamUrl(agentId);
  const { events, connected } = useEventStream<string>(url, {
    parser: (raw) => raw, // log lines arrive as plain text, not JSON
  });

  return (
    <LogStreamPane
      lines={events}
      connected={connected}
      className="h-full"
    />
  );
}

// ── DispatchDetail ──────────────────────────────────────────────────────────

interface DispatchDetailProps {
  dispatch: Dispatch;
}

export function DispatchDetail({ dispatch }: DispatchDetailProps) {
  // Parse optional metadata
  let meta: Record<string, unknown> = {};
  try {
    if (dispatch.metadata) meta = JSON.parse(dispatch.metadata);
  } catch { /* ignore malformed metadata */ }

  const agentId = typeof meta.agent_id === 'string' ? meta.agent_id : null;
  const prUrl = typeof meta.pr_url === 'string' ? meta.pr_url : null;
  const diffPath = typeof meta.diff_path === 'string' ? meta.diff_path : null;

  const createdDate = new Date(dispatch.created_at * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-5 gap-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href="/dispatches"
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
              aria-label="Back to dispatch board"
            >
              ← Board
            </Link>
            <span className="text-stone-700">/</span>
            <span className="text-[12px] font-mono text-stone-500">{dispatch.id}</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground leading-snug">
            {dispatch.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-[12px] text-stone-500">
            <StatusBadge status={dispatch.status} />
            {dispatch.assignee && (
              <span className="font-mono">@{dispatch.assignee}</span>
            )}
            {dispatch.priority !== 0 && (
              <span>P{dispatch.priority}</span>
            )}
            <span>{createdDate}</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      {dispatch.body && (
        <div className="text-sm text-stone-400 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 max-h-32 overflow-auto whitespace-pre-wrap">
          {dispatch.body}
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="events" className="flex-1 min-h-0">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="diff">Diff</TabsTrigger>
          <TabsTrigger value="acceptance">Acceptance</TabsTrigger>
          <TabsTrigger value="logs">
            Agent logs
            {!agentId && (
              <span className="ml-1 text-stone-600 text-[10px]">(n/a)</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="h-[calc(100%-2.5rem)] overflow-hidden">
          <EventsTab dispatchId={dispatch.id} />
        </TabsContent>

        <TabsContent value="diff" className="h-[calc(100%-2.5rem)] overflow-hidden">
          <DiffTab prUrl={prUrl} diffPath={diffPath} />
        </TabsContent>

        <TabsContent value="acceptance" className="overflow-auto">
          <AcceptanceTab dispatchId={dispatch.id} />
        </TabsContent>

        <TabsContent value="logs" className="h-[calc(100%-2.5rem)] overflow-hidden">
          {agentId ? (
            <AgentLogsTab agentId={agentId} />
          ) : (
            <div className="text-stone-500 italic text-sm py-6 text-center">
              (no agent_id in dispatch metadata — logs not available)
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
