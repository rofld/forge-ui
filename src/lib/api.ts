import type {
  ThreadInfo,
  ThreadDetail,
  Message,
  Archives,
  Memory,
  PoolInfo,
  PoolDetail,
  CreateThreadOpts,
} from './types';
import type { WBNode } from '@/components/whiteboard/types';

const API_BASE =
  process.env.NEXT_PUBLIC_FORGE_API || 'http://localhost:3142';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${body}`);
  }
  // 204 or empty body
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ── Threads ──────────────────────────────────────────────────────────

export async function listThreads(): Promise<ThreadInfo[]> {
  return apiFetch<ThreadInfo[]>('/threads');
}

export async function getThread(id: string): Promise<ThreadDetail> {
  return apiFetch<ThreadDetail>(`/threads/${id}`);
}

export async function createThread(opts?: CreateThreadOpts): Promise<ThreadInfo> {
  return apiFetch<ThreadInfo>('/threads', {
    method: 'POST',
    body: JSON.stringify(opts ?? {}),
  });
}

export async function deleteThread(id: string, force?: boolean): Promise<void> {
  const query = force ? '?force=true' : '';
  await apiFetch<void>(`/threads/${id}${query}`, { method: 'DELETE' });
}

export async function renameThread(id: string, newId: string): Promise<ThreadInfo> {
  return apiFetch<ThreadInfo>(`/threads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ id: newId }),
  });
}

// ── Shared Context ──────────────────────────────────────────────────

export async function listSharedContext(threadId: string): Promise<{ name: string; content: string }[]> {
  const data = await apiFetch<{ shared_context: { agent: string; content: string }[] }>(`/threads/${threadId}/shared`);
  return (data.shared_context ?? []).map((e) => ({ name: e.agent, content: e.content }));
}

export async function updateSharedContext(threadId: string, name: string, content: string): Promise<void> {
  await apiFetch<void>(`/threads/${threadId}/shared/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function deleteSharedContext(threadId: string, name: string): Promise<void> {
  await apiFetch<void>(`/threads/${threadId}/shared/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

export async function uploadSharedContext(threadId: string, file: File): Promise<{ name: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/threads/${threadId}/shared`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${body}`);
  }
  return res.json();
}

// ── Messages ─────────────────────────────────────────────────────────

export async function getMessages(threadId: string): Promise<Message[]> {
  const data = await apiFetch<{ messages: Message[]; count: number }>(
    `/threads/${threadId}/messages`
  );
  // Graceful fallback if endpoint not yet implemented
  return data.messages ?? (data as unknown as Message[]);
}

// ── Archives ─────────────────────────────────────────────────────────

export async function getArchives(threadId: string): Promise<Archives> {
  return apiFetch<Archives>(`/threads/${threadId}/archives`);
}

// ── Memories ─────────────────────────────────────────────────────────

export async function getMemories(threadId: string): Promise<Memory[]> {
  const data = await apiFetch<{ memories: Memory[] }>(
    `/threads/${threadId}/memories`
  );
  return data.memories ?? [];
}

export async function updateMemory(
  threadId: string,
  name: string,
  content: string
): Promise<void> {
  await apiFetch<void>(`/threads/${threadId}/memories/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

/** Returns the fetch call that produces an SSE ReadableStream. */
export function postMessage(
  threadId: string,
  content: string,
  model?: string,
  thinkingBudget?: number,
  effort?: string,
): Promise<Response> {
  const body: Record<string, unknown> = { content };
  if (model) body.model = model;
  if (effort) body.effort = effort;
  else if (thinkingBudget && thinkingBudget > 0) body.thinking_budget = thinkingBudget;
  return fetch(`${API_BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Pools ─────────────────────────────────────────────────────────────

export async function listPools(): Promise<PoolInfo[]> {
  const data = await apiFetch<{ pools: PoolInfo[] }>('/pools');
  return data.pools ?? [];
}

export async function getPool(id: string): Promise<PoolDetail> {
  return apiFetch<PoolDetail>(`/pools/${id}`);
}

// ── WorkChat ──────────────────────────────────────────────────────────

export interface WorkChatMessage {
  id: string;
  from: string;
  to: { kind: string; value?: string };
  msg_type: string;
  content: string;
  timestamp: string;
  reply_to?: string;
}

export async function getPoolWorkChat(poolId: string, limit = 50): Promise<{ messages: WorkChatMessage[]; offset: number }> {
  return apiFetch(`/pools/${poolId}/workchat?limit=${limit}`);
}

export async function postPoolWorkChat(poolId: string, content: string, from = 'human'): Promise<{ id: string }> {
  return apiFetch(`/pools/${poolId}/workchat`, {
    method: 'POST',
    body: JSON.stringify({ content, from }),
  });
}

export async function getThreadWorkChat(threadId: string, limit = 50): Promise<{ messages: WorkChatMessage[]; offset: number }> {
  return apiFetch(`/threads/${threadId}/workchat?limit=${limit}`);
}

export function poolWorkChatSSE(poolId: string): EventSource {
  return new EventSource(`${API_BASE}/pools/${poolId}/workchat/stream`);
}

// ── Steering ──────────────────────────────────────────────────────────

export async function steerThread(threadId: string, content: string): Promise<void> {
  await apiFetch(`/threads/${threadId}/steer`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ── Files ─────────────────────────────────────────────────────────────

export async function readFile(path: string): Promise<{ path: string; content: string; language: string; size: number }> {
  return apiFetch(`/files?path=${encodeURIComponent(path)}`);
}

export async function writeFile(path: string, content: string): Promise<{ status: string; path: string; size: number }> {
  return apiFetch('/files', {
    method: 'PUT',
    body: JSON.stringify({ path, content }),
  });
}

// ── Whiteboard ────────────────────────────────────────────────────────

export async function saveWhiteboardContext(threadId: string, nodes: WBNode[]): Promise<void> {
  const summary = nodes.map((n) => {
    if (n.type === 'heading') return `## ${n.content}`;
    if (n.type === 'file') return `[File: ${n.filePath || n.content}]`;
    return n.content;
  }).filter(Boolean).join('\n\n');

  if (summary.trim()) {
    await apiFetch<void>(`/threads/${threadId}/shared/${encodeURIComponent('whiteboard')}`, {
      method: 'PUT',
      body: JSON.stringify({ content: `# Whiteboard Notes\n\n${summary}` }),
    });
  }
}
