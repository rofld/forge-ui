'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { startSession, getSession, subscribeSession } from './sse-manager';
import type { Message, TokenStats } from './types';

// ── Segment types ───────────────────────────────────────────────────

export interface TextSegment { kind: 'text'; content: string; }
export interface ToolSegment {
  kind: 'tool'; id: string; name: string; input?: unknown;
  status: 'running' | 'success' | 'error'; output?: string;
  startTime: number; endTime?: number; durationMs?: number;
}
export interface ThinkingSegment { kind: 'thinking'; }
export type StreamSegment = TextSegment | ToolSegment | ThinkingSegment;

export interface UseSSEReturn {
  messages: Message[];
  isStreaming: boolean;
  segments: StreamSegment[];
  lastToolCalls: ToolSegment[];
  tokenStats: TokenStats | null;
  error: string | null;
  sendMessage: (content: string, model?: string, thinkingBudget?: number, effort?: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useSSE(threadId: string, initialMessages: Message[] = []): UseSSEReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [segments, setSegments] = useState<StreamSegment[]>([]);
  const [lastToolCalls, setLastToolCalls] = useState<ToolSegment[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const committedRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);

  // Sync function — reads session state into React state
  const syncFromSession = useCallback(() => {
    const session = getSession(threadId);
    if (!session) return;

    setSegments([...session.segments]);
    setIsStreaming(session.isStreaming);
    if (session.error) setError(session.error);
    if (session.tokenStats) setTokenStats(session.tokenStats);

    if (!session.isStreaming && session.finalText && !committedRef.current) {
      committedRef.current = true;
      setLastToolCalls([...session.lastToolCalls]);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content === session.finalText) return prev;
        return [...prev, { role: 'assistant', content: session.finalText! }];
      });
      // Don't clear segments — keep them visible to avoid position reset.
      // They'll be replaced on the next sendMessage.
    }
  }, [threadId]);

  // On mount: check for existing session and subscribe
  useEffect(() => {
    const session = getSession(threadId);
    if (session) {
      syncFromSession();
      if (session.isStreaming) {
        unsubRef.current = subscribeSession(threadId, syncFromSession);
      }
    }
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [threadId, syncFromSession]);

  const sendMessage = useCallback(
    (content: string, model?: string, thinkingBudget?: number, effort?: string) => {
      setError(null);
      committedRef.current = false;

      // Optimistically add the user message
      setMessages((prev) => [...prev, { role: 'user', content }]);

      // Clean up previous subscription
      unsubRef.current?.();

      // Start session and subscribe IMMEDIATELY (before React re-renders)
      const session = startSession(threadId, content, model, thinkingBudget, effort);
      setIsStreaming(true);
      setSegments([...session.segments]);

      // Subscribe to updates from the background reader
      unsubRef.current = subscribeSession(threadId, syncFromSession);
    },
    [threadId, syncFromSession]
  );

  return {
    messages, isStreaming, segments, lastToolCalls,
    tokenStats, error, sendMessage, setMessages,
  };
}
