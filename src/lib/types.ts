export interface ThreadInfo {
  id: string;
  created: string;
  last_active: string;
  model: string;
  provider: string;
  working_dir: string;
  total_operations: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

export interface ArchiveInfo {
  l0_count: number;
  l1_count: number;
  has_l2: boolean;
}

export interface ThreadDetail extends ThreadInfo {
  archive: ArchiveInfo;
  messages_bytes: number;
}

export interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  // tool_result
  content?: string | ContentBlock[];
  is_error?: boolean;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface Archives {
  l2: string | null;
  l1: { name: string; content: string }[];
  l0: { id: number; content: string }[];
}

export interface Memory {
  name: string;
  content: string;
}

export interface PoolInfo {
  id: string;
  agent_count: number;
  pending_tasks: number;
  completed_tasks: number;
}

export interface HeartbeatEntry {
  agent: string;
  task?: string | null;
  tokens?: number;
  status?: string;
  ts?: string;
}

export interface PoolDetail {
  id: string;
  briefing: string | null;
  shared_context: { agent: string; content: string }[];
  heartbeats: HeartbeatEntry[];
  pending_tasks: number;
  completed_tasks: number;
}

export interface CreateThreadOpts {
  id?: string;
  model?: string;
  working_dir?: string;
}

// SSE event types
export interface SseStartEvent {
  type: 'start';
  model: string;
}

export interface SseAssistantEvent {
  type: 'assistant';
  text: string;
  model: string;
  stop_reason: string;
  tool_calls: { id: string; name: string }[];
}

export interface SseToolEvent {
  type: 'tool_start' | 'tool_end';
  id: string;
  name: string;
  is_error?: boolean;
  output?: string;
}

export interface SseDoneEvent {
  type: 'done';
  error?: string | null;
}

export interface SseCompleteEvent {
  type: 'complete';
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
}

export interface SseTextDeltaEvent {
  type: 'text_delta';
  text: string;
}

export type SseEventData =
  | SseStartEvent
  | SseAssistantEvent
  | SseToolEvent
  | SseDoneEvent
  | SseCompleteEvent
  | SseTextDeltaEvent;

export interface TokenStats {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
}
