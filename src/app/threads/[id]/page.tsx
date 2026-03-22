'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { getThread, getMessages } from '@/lib/api';
import { shortModel, formatTokens, estimateCost, formatCost } from '@/lib/format';
import { useSSE } from '@/lib/use-sse';
import MessageBubble from '@/components/chat/MessageBubble';
import StreamingText from '@/components/chat/StreamingText';
import ChatInput from '@/components/chat/ChatInput';
import type { ThreadDetail, Message } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ThreadPage({ params }: Props) {
  const { id } = use(params);

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    streamingText,
    activeTools,
    tokenStats,
    error,
    sendMessage,
    setMessages,
  } = useSSE(id, initialMessages);

  // Load thread metadata and message history
  useEffect(() => {
    async function load() {
      try {
        const [td, msgs] = await Promise.allSettled([
          getThread(id),
          getMessages(id),
        ]);
        if (td.status === 'fulfilled') setThread(td.value);
        else setLoadError(td.reason?.message ?? String(td.reason));

        if (msgs.status === 'fulfilled') {
          setInitialMessages(msgs.value);
          setMessages(msgs.value);
        }
        setInitialLoaded(true);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
        setInitialLoaded(true);
      }
    }
    load();
  }, [id, setMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const model = thread?.model ?? '';
  const inputTok = tokenStats?.input_tokens ?? thread?.total_input_tokens ?? 0;
  const outputTok = tokenStats?.output_tokens ?? thread?.total_output_tokens ?? 0;
  const cacheTok = tokenStats?.cache_read_tokens ?? 0;
  const cost = estimateCost(model, inputTok, outputTok, cacheTok);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 font-mono text-xs">
          <Link href="/threads" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Threads
          </Link>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-100 font-bold">{id}</span>
          {thread && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-400">{shortModel(thread.model)}</span>
              <span className="text-zinc-600">{thread.provider}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {thread && (
            <Link
              href={`/threads/${id}/knowledge`}
              className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              knowledge ◈
            </Link>
          )}
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!initialLoaded && (
          <div className="text-zinc-600 font-mono text-xs">Loading…</div>
        )}
        {loadError && (
          <div className="text-red-400 font-mono text-xs mb-4">
            Could not load thread: {loadError}
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {(isStreaming || streamingText || activeTools.length > 0) && (
          <StreamingText text={streamingText} activeTools={activeTools} />
        )}
        {error && (
          <div className="my-2 px-3 py-2 bg-red-950 border border-red-800 rounded font-mono text-xs text-red-300">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat input */}
      <ChatInput
        onSend={(content) => sendMessage(content, thread?.model)}
        disabled={isStreaming}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-900 bg-zinc-950 font-mono text-xs text-zinc-500 shrink-0">
        <div className="flex items-center gap-3">
          <span title="Input tokens">↑{formatTokens(inputTok)}</span>
          <span title="Output tokens">↓{formatTokens(outputTok)}</span>
          {cacheTok > 0 && (
            <span title="Cache read">cache:{formatTokens(cacheTok)}</span>
          )}
          <span className="text-emerald-700" title="Estimated cost">
            {formatCost(cost)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {thread && (
            <span>op:{thread.total_operations}</span>
          )}
          {isStreaming && (
            <span className="text-amber-400 animate-pulse">streaming…</span>
          )}
        </div>
      </div>
    </div>
  );
}
