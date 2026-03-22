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

export async function deleteThread(id: string): Promise<void> {
  await apiFetch<void>(`/threads/${id}`, { method: 'DELETE' });
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
  model?: string
): Promise<Response> {
  return fetch(`${API_BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, model }),
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
