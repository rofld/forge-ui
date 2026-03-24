/**
 * Global SSE session manager — runs agent streams independently of React.
 *
 * The SSE reader lives here, not in React. When a user navigates away,
 * the reader keeps consuming and accumulating results. When they return,
 * the hook syncs from the session state.
 */

import { postMessage } from './api';
import type { StreamSegment, ToolSegment, TextSegment } from './use-sse';
import type { SseAssistantEvent, SseToolEvent, SseCompleteEvent, TokenStats } from './types';

export interface ActiveSession {
  threadId: string;
  segments: StreamSegment[];
  lastToolCalls: ToolSegment[];
  finalText: string | null;
  isStreaming: boolean;
  error: string | null;
  tokenStats: TokenStats | null;
  listeners: Set<() => void>;
}

const sessions = new Map<string, ActiveSession>();

export function getSession(threadId: string): ActiveSession | undefined {
  return sessions.get(threadId);
}

export function isSessionActive(threadId: string): boolean {
  return sessions.get(threadId)?.isStreaming ?? false;
}

export function subscribeSession(threadId: string, listener: () => void): () => void {
  const session = sessions.get(threadId);
  if (!session) return () => {};
  session.listeners.add(listener);
  return () => session.listeners.delete(listener);
}

let pendingNotify: Set<ActiveSession> = new Set();
let rafId: number | null = null;

function flushNotify() {
  rafId = null;
  const batch = pendingNotify;
  pendingNotify = new Set();
  for (const session of batch) {
    session.listeners.forEach((fn) => {
      try { fn(); } catch { /* */ }
    });
  }
}

function notify(session: ActiveSession) {
  pendingNotify.add(session);
  if (rafId === null && typeof requestAnimationFrame !== 'undefined') {
    rafId = requestAnimationFrame(flushNotify);
  } else if (typeof requestAnimationFrame === 'undefined') {
    // SSR fallback
    flushNotify();
  }
}

/** Force-notify immediately (for completion events) */
function notifyImmediate(session: ActiveSession) {
  pendingNotify.delete(session);
  session.listeners.forEach((fn) => {
    try { fn(); } catch { /* */ }
  });
}

function parseSseLine(eventName: string, dataStr: string): { event: string; data: Record<string, unknown> } | null {
  try {
    return { event: eventName, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

/**
 * Start a new SSE session. The reader runs in the background,
 * accumulating segments. React hooks subscribe to updates.
 */
export function startSession(
  threadId: string,
  content: string,
  model?: string,
  thinkingBudget?: number,
  effort?: string,
): ActiveSession {
  // If there's already an active session, return it
  const existing = sessions.get(threadId);
  if (existing?.isStreaming) return existing;

  const session: ActiveSession = {
    threadId,
    segments: [{ kind: 'thinking' }],
    lastToolCalls: [],
    finalText: null,
    isStreaming: true,
    error: null,
    tokenStats: null,
    listeners: new Set(),
  };
  sessions.set(threadId, session);

  // Run the SSE reader in the background (not tied to React)
  runReader(session, content, model, thinkingBudget, effort);

  return session;
}

async function runReader(
  session: ActiveSession,
  content: string,
  model?: string,
  thinkingBudget?: number,
  effort?: string,
) {
  let accText = '';

  try {
    const response = await postMessage(session.threadId, content, model, thinkingBudget, effort);

    if (!response.ok) {
      session.error = `Server error: ${response.status}`;
      session.isStreaming = false;
      notify(session);
      return;
    }

    if (!response.body) {
      session.error = 'No response body';
      session.isStreaming = false;
      notify(session);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = 'message';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (!dataStr) continue;

          const parsed = parseSseLine(currentEvent, dataStr);
          if (!parsed) continue;

          const { event, data } = parsed;

          if (event === 'message' || data.type === 'assistant') {
            const ev = data as unknown as SseAssistantEvent;
            const text = ev.text || accText;
            const hasToolCalls = ev.tool_calls?.length > 0;

            if (text) {
              accText = '';
              const segs = session.segments.filter((s) => s.kind !== 'thinking');
              const lastText = [...segs].reverse().find((s) => s.kind === 'text');
              if (lastText?.kind === 'text' && lastText.content === text) {
                session.segments = segs;
              } else if (!hasToolCalls) {
                const last = segs[segs.length - 1];
                if (last?.kind === 'text') {
                  session.segments = [...segs.slice(0, -1), { kind: 'text', content: text }];
                } else {
                  session.segments = [...segs, { kind: 'text', content: text }];
                }
              } else {
                session.segments = [...segs, { kind: 'text', content: text }];
              }
            }

            if (hasToolCalls) {
              session.segments = [
                ...session.segments,
                ...ev.tool_calls.map((tc) => ({
                  kind: 'tool' as const,
                  id: tc.id,
                  name: tc.name,
                  input: (tc as unknown as Record<string, unknown>).input,
                  status: 'running' as const,
                  startTime: Date.now(),
                })),
              ];
            }
            notify(session);

          } else if (data.type === 'text_delta') {
            const delta = (data as { text: string }).text ?? '';
            accText += delta;
            const segs = session.segments.filter((s) => s.kind !== 'thinking');
            const last = segs[segs.length - 1];
            if (last?.kind === 'text') {
              session.segments = [...segs.slice(0, -1), { kind: 'text' as const, content: accText }];
            } else {
              session.segments = [...segs, { kind: 'text' as const, content: accText }];
            }
            notify(session);

          } else if (data.type === 'thinking_delta') {
            if (!session.segments.some((s) => s.kind === 'thinking')) {
              session.segments = [{ kind: 'thinking' }, ...session.segments.filter((s) => s.kind !== 'thinking')];
              notify(session);
            }

          } else if (data.type === 'tool_start') {
            const ev = data as unknown as SseToolEvent;
            const exists = session.segments.some((s) => s.kind === 'tool' && s.id === ev.id);
            if (exists) {
              session.segments = session.segments.map((s) =>
                s.kind === 'tool' && s.id === ev.id
                  ? { ...s, input: (ev as unknown as Record<string, unknown>).input ?? s.input }
                  : s
              );
            } else {
              session.segments = [
                ...session.segments.filter((s) => s.kind !== 'thinking'),
                { kind: 'tool', id: ev.id, name: ev.name, input: (ev as unknown as Record<string, unknown>).input, status: 'running', startTime: Date.now() },
              ];
            }
            notify(session);

          } else if (data.type === 'tool_end') {
            const ev = data as unknown as SseToolEvent;
            session.segments = session.segments.map((s) =>
              s.kind === 'tool' && s.id === ev.id
                ? { ...s, status: ev.is_error ? 'error' : 'success', endTime: Date.now(), output: ev.output, durationMs: (ev as unknown as Record<string, unknown>).duration_ms as number | undefined }
                : s
            );
            notify(session);

          } else if (event === 'complete' || data.type === 'complete') {
            const ev = data as unknown as SseCompleteEvent;
            session.tokenStats = { input_tokens: ev.input_tokens, output_tokens: ev.output_tokens, cache_read_tokens: ev.cache_read_tokens };
            notifyImmediate(session);

          } else if (event === 'done' || data.type === 'done') {
            if (accText) {
              const segs = session.segments.filter((s) => s.kind !== 'thinking');
              const last = segs[segs.length - 1];
              if (last?.kind === 'text') {
                session.segments = [...segs.slice(0, -1), { kind: 'text', content: accText }];
              } else {
                session.segments = [...segs, { kind: 'text', content: accText }];
              }
              accText = '';
            }
            notifyImmediate(session);

          } else if (event === 'error' || data.type === 'error') {
            session.error = (data as { message?: string }).message ?? 'Unknown error';
            notifyImmediate(session);
          }
        } else if (line === '') {
          currentEvent = 'message';
        }
      }
    }

    // Final flush
    if (accText) {
      const segs = session.segments.filter((s) => s.kind !== 'thinking');
      const last = segs[segs.length - 1];
      if (last?.kind === 'text') {
        session.segments = [...segs.slice(0, -1), { kind: 'text', content: accText }];
      } else {
        session.segments = [...segs, { kind: 'text', content: accText }];
      }
    }

    // Save tool calls
    const tools = session.segments.filter((s): s is ToolSegment => s.kind === 'tool');
    if (tools.length > 0) session.lastToolCalls = tools;

    // Extract final text
    const textSegs = session.segments.filter((s): s is TextSegment => s.kind === 'text');
    session.finalText = textSegs[textSegs.length - 1]?.content ?? null;

  } catch (err) {
    session.error = err instanceof Error ? err.message : String(err);
  } finally {
    session.isStreaming = false;
    notifyImmediate(session);
  }
}
