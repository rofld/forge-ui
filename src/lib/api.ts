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

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('forge_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('forge_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('forge_token');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
  };
  // Merge with caller headers (caller wins)
  if (init?.headers) {
    Object.assign(headers, init.headers);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (res.status === 401) {
    // Clear stale token and redirect to login
    clearAuthToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('unauthorized');
  }
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
    headers: authHeaders(),
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
  agentId?: string,
): Promise<Response> {
  const body: Record<string, unknown> = { content };
  if (model) body.model = model;
  if (effort) body.effort = effort;
  else if (thinkingBudget && thinkingBudget > 0) body.thinking_budget = thinkingBudget;
  if (agentId) body.agent_id = agentId;
  return fetch(`${API_BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
  const token = getAuthToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return new EventSource(`${API_BASE}/pools/${poolId}/workchat/stream${tokenParam}`);
}

// ── Agents (Claw) ────────────────────────────────────────────────────

export interface AgentRecord {
  id: string;
  name: string;
  owner: string;
  model: string;
  persona: string | null;
  container_id: string | null;
  status: string;
  working_dir: string;
  created_at: string | null;
}

export interface AgentStats {
  total_sessions: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cost_usd: number;
}

export interface CreateAgentRequest {
  name: string;
  owner: string;
  model?: string;
  persona?: string;
  working_dir?: string;
}

export async function listAgents(owner?: string): Promise<AgentRecord[]> {
  const query = owner ? `?owner=${encodeURIComponent(owner)}` : '';
  return apiFetch<AgentRecord[]>(`/agents${query}`);
}

export async function getAgent(id: string): Promise<AgentRecord> {
  return apiFetch<AgentRecord>(`/agents/${id}`);
}

export async function createAgent(req: CreateAgentRequest): Promise<AgentRecord> {
  return apiFetch<AgentRecord>('/agents', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  await apiFetch<void>(`/agents/${id}`, { method: 'DELETE' });
}

export async function getAgentStats(id: string): Promise<AgentStats> {
  return apiFetch<AgentStats>(`/agents/${id}/stats`);
}

export async function getAgentThreads(id: string): Promise<string[]> {
  return apiFetch<string[]>(`/agents/${id}/threads`);
}

export async function linkAgentThread(agentId: string, threadId: string): Promise<void> {
  await apiFetch(`/agents/${agentId}/threads`, {
    method: 'POST',
    body: JSON.stringify({ thread_id: threadId }),
  });
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
