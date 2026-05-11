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

// ── Auth types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  created_at: number; // unix ms
}

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

/** POST /login — exchange credentials for a token + User. Throws on 401. */
export async function login(
  username: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 401) {
    const body = await res.json().catch(() => ({ error: 'invalid credentials' }));
    throw new Error(body.error ?? 'invalid credentials');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${body}`);
  }
  return res.json() as Promise<{ token: string; user: User }>;
}

/** POST /logout — invalidate the current token server-side, then clear it locally. */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>('/logout', { method: 'POST' });
  } finally {
    // Always clear locally, even if the server call fails.
    clearAuthToken();
  }
}

/** GET /me — fetch the authenticated user's profile. Throws on 401. */
export async function getMe(): Promise<User> {
  return apiFetch<User>('/me');
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

export interface UpdateAgentRequest {
  model?: string;
  /** String sets the persona, null clears it, omit for no-op. */
  persona?: string | null;
}

/** PATCH /agents/:id — update agent model and/or persona. Returns the updated record. */
export async function updateAgent(id: string, req: UpdateAgentRequest): Promise<AgentRecord> {
  return apiFetch<AgentRecord>(`/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(req),
  });
}

export interface PauseAgentResponse {
  status: 'paused' | 'active';
  agent_id: string;
}

/** POST /agents/:id/pause — toggle the agent between paused and active. */
export async function pauseAgent(id: string): Promise<PauseAgentResponse> {
  return apiFetch<PauseAgentResponse>(`/agents/${id}/pause`, { method: 'POST' });
}

/** GET /agents/:id/tasks — list all tasks belonging to an agent. */
export async function getAgentTasks(id: string): Promise<TaskRecord[]> {
  return apiFetch<TaskRecord[]>(`/agents/${id}/tasks`);
}

// ── Tasks (Autonomous Fire-and-Forget) ───────────────────────────────

export interface TaskRecord {
  id: string;
  agent_id: string | null;
  prompt: string;
  model: string;
  persona: string | null;
  done_marker: string;
  max_iterations: number;
  status: string; // pending, running, completed, failed
  result: string | null;
  error: string | null;
  iterations_run: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  webhook_url: string | null;
  thread_id: string | null;
  working_dir: string;
  created_at: string | null;
  completed_at: string | null;
}

export interface CreateTaskRequest {
  prompt: string;
  agent_id?: string;
  model?: string;
  persona?: string;
  done_marker?: string;
  max_iterations?: number;
  working_dir?: string;
  webhook_url?: string;
}

export async function listTasks(status?: string): Promise<TaskRecord[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<TaskRecord[]>(`/tasks${query}`);
}

export async function getTask(id: string): Promise<TaskRecord> {
  return apiFetch<TaskRecord>(`/tasks/${id}`);
}

export async function createTask(req: CreateTaskRequest): Promise<TaskRecord> {
  return apiFetch<TaskRecord>('/tasks', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' });
}

export function taskStreamUrl(taskId: string): string {
  const token = getAuthToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE}/tasks/${taskId}/stream${tokenParam}`;
}

// ── Steering ──────────────────────────────────────────────────────────

export async function steerThread(threadId: string, content: string): Promise<void> {
  await apiFetch(`/threads/${threadId}/steer`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ── Dream ─────────────────────────────────────────────────────────────

export interface DreamResponse {
  status: 'dream_scheduled';
  thread_id: string;
}

/**
 * POST /threads/:id/dream — schedule a dream consolidation pass on the
 * thread. The pass runs automatically on the next resume of that thread.
 */
export async function triggerDream(threadId: string): Promise<DreamResponse> {
  return apiFetch<DreamResponse>(`/threads/${threadId}/dream`, { method: 'POST' });
}

// ── Knowledge ─────────────────────────────────────────────────────────

export interface KnowledgeRecord {
  record_type: string;
  content: string;
  tags: string[];
}

export interface KnowledgeSearchResponse {
  records: KnowledgeRecord[];
}

/**
 * GET /threads/:id/knowledge/search?q=term&limit=N — BM25 search over the
 * thread's knowledge store. Returns up to `limit` records (default 10).
 */
export async function searchKnowledge(
  threadId: string,
  query: string,
  limit = 10,
): Promise<KnowledgeSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return apiFetch<KnowledgeSearchResponse>(
    `/threads/${threadId}/knowledge/search?${params.toString()}`,
  );
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

// ── Dispatches (kanban-backed) ────────────────────────────────────────────────

/// Sprint 35-W.2 + 35-W.3 — wrappers over forge-server's `/dispatches` routes.
/// A "dispatch" is a kanban Task created from a GitHub issue (metadata.github_issue is set).
/// The 7 statuses match forge-core's `kanban::TaskStatus` enum (snake_case wire format).

export type DispatchStatus =
  | 'triage'
  | 'todo'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'done'
  | 'archived';

/// Mirror of `forge_core::kanban::Task`. Wire format: snake_case JSON keys.
export interface Dispatch {
  id: string;
  title: string;
  body: string | null;
  status: DispatchStatus;
  priority: number;
  assignee: string | null;
  claim_lock: string | null;
  claim_at: number | null;
  created_at: number;
  updated_at: number;
  block_reason: string | null;
  /** JSON-serialized; deserialize with JSON.parse() if non-null. */
  metadata: string | null;
}

export interface DispatchAcceptance {
  dispatch_id: string;
  passed: boolean | null;
  command: string | null;
  output: string | null;
  exit_code: number | null;
}

/// GET /dispatches — list all dispatch tasks (those with `metadata.github_issue` set).
export async function listDispatches(): Promise<Dispatch[]> {
  return apiFetch<Dispatch[]>('/dispatches');
}

/// GET /dispatches/{id} — single dispatch by ID.
export async function getDispatch(id: string): Promise<Dispatch> {
  return apiFetch<Dispatch>(`/dispatches/${id}`);
}

/// PATCH /dispatches/{id} — kanban drag-drop transition. Body: `{ status }`.
/// Server enforces the legal-edge state machine.
export async function patchDispatchStatus(
  id: string,
  status: DispatchStatus,
): Promise<Dispatch> {
  return apiFetch<Dispatch>(`/dispatches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/// GET /acceptance/{dispatch_id} — last-known acceptance result for a dispatch.
/// 404 → null.
export async function getDispatchAcceptance(
  id: string,
): Promise<DispatchAcceptance | null> {
  try {
    return await apiFetch<DispatchAcceptance>(`/acceptance/${id}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) return null;
    throw e;
  }
}

/// EventSource URL for `/dispatches/{id}/stream` — UEP events for this task.
/// Auth via query-param token (mirrors `taskStreamUrl`).
export function dispatchStreamUrl(id: string): string {
  const token = getAuthToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE}/dispatches/${id}/stream${tokenParam}`;
}

/// EventSource URL for `/agents/{id}/logs/stream` — per-agent live log tail.
export function agentLogsStreamUrl(agentId: string): string {
  const token = getAuthToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE}/agents/${agentId}/logs/stream${tokenParam}`;
}

// ── POST /issues/:number/dispatch (used by DispatchForm) ──────────────────────

export interface CreateDispatchRequest {
  model: string;
  persona?: string | null;
  acceptance?: string | null;
  max_iterations?: number;
  worktree_dir?: string | null;
}

export async function createDispatch(
  issueNumber: number,
  req: CreateDispatchRequest,
): Promise<Dispatch> {
  return apiFetch<Dispatch>(`/issues/${issueNumber}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ── Fleet ─────────────────────────────────────────────────────────────────────

export interface FleetWorker {
  worker_id: string;
  task_id: string;
  started_at: number;
}

export async function listFleetHeartbeats(): Promise<FleetWorker[]> {
  return apiFetch<FleetWorker[]>('/fleet/heartbeats');
}

// ── Workspace explorer (thread-scoped) ──────────────────────────────────────

export interface WorkspaceTreeResponse {
  entries: { name: string; is_dir: boolean; size: number }[];
  truncated?: boolean;
  total?: number;
}

export interface WorkspaceFileResponse {
  path: string;
  content: string;
  size: number;
  mime_type: string;
}

/** GET /threads/{id}/workspace/tree — list directory in thread sandbox */
export async function getWorkspaceTree(
  threadId: string,
  path: string = '/workspace',
  maxEntries: number = 1000,
): Promise<WorkspaceTreeResponse> {
  const params = new URLSearchParams({ path, max_entries: String(maxEntries) });
  return apiFetch<WorkspaceTreeResponse>(
    `/threads/${threadId}/workspace/tree?${params.toString()}`,
  );
}

/** GET /threads/{id}/workspace/file — read file from thread sandbox */
export async function getWorkspaceFile(
  threadId: string,
  path: string,
): Promise<WorkspaceFileResponse> {
  const params = new URLSearchParams({ path });
  return apiFetch<WorkspaceFileResponse>(
    `/threads/${threadId}/workspace/file?${params.toString()}`,
  );
}

/** GET /threads/{id}/workspace/download — download file from thread sandbox */
export async function downloadWorkspaceFile(
  threadId: string,
  path: string,
): Promise<Response> {
  const params = new URLSearchParams({ path });
  return fetch(
    `${API_BASE}/threads/${threadId}/workspace/download?${params.toString()}`,
    {
      headers: authHeaders(),
    },
  );
}
