'use client';

import { useCallback, useRef, useState } from 'react';
import { postMessage } from './api';
import type {
  Message,
  SseAssistantEvent,
  SseCompleteEvent,
  SseToolEvent,
  TokenStats,
} from './types';

export interface ToolCallState {
  id: string;
  name: string;
  status: 'running' | 'success' | 'error';
  startTime: number;
  endTime?: number;
  output?: string;
}

export interface UseSSEReturn {
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  activeTools: ToolCallState[];
  tokenStats: TokenStats | null;
  error: string | null;
  sendMessage: (content: string, model?: string) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

/** Parse a single SSE line pair (event + data) into typed event data. */
function parseSseLine(
  eventName: string,
  dataStr: string
): { event: string; data: Record<string, unknown> } | null {
  try {
    return { event: eventName, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

export function useSSE(threadId: string, initialMessages: Message[] = []): UseSSEReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeTools, setActiveTools] = useState<ToolCallState[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track tool start times
  const toolStartTimes = useRef<Record<string, number>>({});

  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      setError(null);
      setIsStreaming(true);
      setStreamingText('');
      setActiveTools([]);

      // Optimistically add the user message
      const userMsg: Message = { role: 'user', content };
      setMessages((prev) => [...prev, userMsg]);

      let accumulatedText = '';

      try {
        const response = await postMessage(threadId, content, model);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let currentEvent = 'message';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // last partial line goes back into buffer

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
                const text = ev.text || accumulatedText;
                if (text) {
                  setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
                }
                accumulatedText = '';
                setStreamingText('');
              } else if (data.type === 'text_delta') {
                const delta = (data as { text: string }).text ?? '';
                accumulatedText += delta;
                setStreamingText(accumulatedText);
              } else if (data.type === 'tool_start') {
                const ev = data as unknown as SseToolEvent;
                toolStartTimes.current[ev.id] = Date.now();
                setActiveTools((prev) => [
                  ...prev,
                  { id: ev.id, name: ev.name, status: 'running', startTime: Date.now() },
                ]);
              } else if (data.type === 'tool_end') {
                const ev = data as unknown as SseToolEvent;
                const startTime = toolStartTimes.current[ev.id] ?? Date.now();
                setActiveTools((prev) =>
                  prev.map((t) =>
                    t.id === ev.id
                      ? {
                          ...t,
                          status: ev.is_error ? 'error' : 'success',
                          endTime: Date.now(),
                          output: ev.output,
                        }
                      : t
                  )
                );
                delete toolStartTimes.current[ev.id];
              } else if (event === 'complete' || data.type === 'complete') {
                const ev = data as unknown as SseCompleteEvent;
                setTokenStats({
                  input_tokens: ev.input_tokens,
                  output_tokens: ev.output_tokens,
                  cache_read_tokens: ev.cache_read_tokens,
                });
              } else if (event === 'done' || data.type === 'done') {
                // Agent ended — commit accumulated text as a message
                if (accumulatedText) {
                  const assistantMsg: Message = {
                    role: 'assistant',
                    content: accumulatedText,
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  setStreamingText('');
                  accumulatedText = '';
                }
              } else if (event === 'error' || data.type === 'error') {
                setError((data as { message?: string }).message ?? 'Unknown error');
              }
            } else if (line === '') {
              // Empty line resets event name
              currentEvent = 'message';
            }
          }
        }

        // If we have accumulated text but never got a done event
        if (accumulatedText) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: accumulatedText },
          ]);
          setStreamingText('');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        // Remove optimistic user message on hard failure
        setMessages((prev) => prev.filter((m) => m !== userMsg));
      } finally {
        setIsStreaming(false);
        setStreamingText('');
      }
    },
    [threadId]
  );

  return {
    messages,
    isStreaming,
    streamingText,
    activeTools,
    tokenStats,
    error,
    sendMessage,
    setMessages,
  };
}
