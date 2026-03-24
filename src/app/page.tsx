'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getMessages, createThread } from '@/lib/api';
import { useSSE } from '@/lib/use-sse';
import ShardIcon from '@/components/ui/ShardIcon';
import InfinityIcon from '@/components/ui/InfinityIcon';
import MessageBubble from '@/components/chat/MessageBubble';
import StreamingText from '@/components/chat/StreamingText';
import ChatInput from '@/components/chat/ChatInput';
import Composer from '@/components/chat/Composer';
import VerboseOutput from '@/components/chat/VerboseOutput';
import ShardMenu from '@/components/chat/ShardMenu';
import FileExplorer from '@/components/files/FileExplorer';
import { useCanvas } from '@/lib/canvas-context';
import { formatTokens, estimateCost, formatCost } from '@/lib/format';
import type { Message } from '@/lib/types';

const GLOBAL_THREAD = '__global__';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function LandingChat() {
  const [ready, setReady] = useState(false);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [verboseOpen, setVerboseOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isOpen: canvasOpen, file: canvasFile, refresh: refreshCanvas } = useCanvas();

  const {
    messages,
    isStreaming,
    segments,
    lastToolCalls,
    tokenStats,
    error,
    sendMessage,
    setMessages,
  } = useSSE(GLOBAL_THREAD, initialMessages);

  useEffect(() => {
    async function init() {
      // Ensure __global__ thread exists
      try {
        await createThread({ id: GLOBAL_THREAD });
      } catch {
        // Already exists — fine
      }

      // Load existing messages (may be empty)
      try {
        const msgs = await getMessages(GLOBAL_THREAD);
        if (msgs && msgs.length > 0) {
          setInitialMessages(msgs);
          setMessages(msgs);
        }
      } catch {
        // No messages yet — fine
      }

      setReady(true);
    }
    init();
  }, [setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, segments]);

  // Auto-refresh canvas when shard edits the open file
  const refreshedToolsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!canvasFile || !canvasOpen) return;
    for (const seg of segments) {
      if (seg.kind !== 'tool') continue;
      if (seg.status !== 'success' && seg.status !== 'error') continue;
      if (refreshedToolsRef.current.has(seg.id)) continue;
      if (seg.name === 'Edit' || seg.name === 'Write') {
        const inp = seg.input as Record<string, unknown> | undefined;
        const filePath = inp?.file_path as string | undefined;
        if (filePath && canvasFile.path.endsWith(filePath.replace(/^\.\//, ''))) {
          refreshedToolsRef.current.add(seg.id);
          refreshCanvas();
        }
      }
    }
  }, [segments, canvasFile, canvasOpen, refreshCanvas]);

  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setComposerOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        setVerboseOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const inputTok = tokenStats?.input_tokens ?? 0;
  const outputTok = tokenStats?.output_tokens ?? 0;
  const cacheTok = tokenStats?.cache_read_tokens ?? 0;
  const cost = estimateCost('claude-opus-4-6', inputTok, outputTok, cacheTok);

  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — Endless mode */}
      {hasMessages && (
        <div className="flex items-center justify-between px-4 py-2.5 glass border-x-0 border-t-0 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <ShardMenu
              onAction={(prompt) => sendMessage(prompt)}
              disabled={isStreaming || !ready}
            />
            <FileExplorer />
            <InfinityIcon size={16} className="text-amber-500" />
            <span className="text-stone-100 font-semibold">Endless</span>
          </div>
          <Link href="/threads/__global__/knowledge">
            <button className="text-xs px-3 py-1 rounded-md glass border-white/[0.1] hover:bg-white/[0.06] text-stone-400 hover:text-stone-200 transition-colors">
              Knowledge
            </button>
          </Link>
        </div>
      )}

      {/* Messages area or centered empty state */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!ready && (
          <div className="text-muted-foreground text-xs animate-pulse">Connecting...</div>
        )}

        {ready && !hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex items-center gap-3 mb-8">
              <ShardIcon size={44} className="text-amber-500/60" />
              <span className="text-stone-600 text-2xl font-light">/</span>
              <InfinityIcon size={38} className="text-amber-500/40" />
            </div>
            <p className="text-stone-200 text-xl font-light mb-2">
              {getGreeting()}
            </p>
            <p className="text-stone-500 text-sm max-w-md leading-relaxed mb-10">
              Endless context — conversations recycle into your knowledge base automatically
            </p>

            {/* Centered glass input for empty state */}
            <div className="w-full max-w-2xl">
              <ChatInput
                onSend={(content, model, thinkingBudget, effort) => sendMessage(content, model, thinkingBudget, effort)}
                disabled={isStreaming || !ready}
                variant="glass"
              />
            </div>
          </div>
        )}

        {hasMessages && (
          <div className="max-w-3xl mx-auto space-y-1">
            {messages.map((msg, i) => {
              // Skip last assistant message if segments are showing it
              const hasSegmentText = segments.some((s) => s.kind === 'text');
              if (hasSegmentText && msg.role === 'assistant' && i === messages.length - 1) return null;
              return <MessageBubble key={`${msg.role}-${i}`} message={msg} />;
            })}
            {segments.length > 0 && (
              <StreamingText segments={segments} isStreaming={isStreaming} />
            )}
            {error && (
              <div className="my-2 px-3 py-2 glass border-red-500/20 rounded-lg text-xs text-red-400">
                {error}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input: ChatInput when no canvas, Composer when canvas open */}
      {hasMessages && (
        canvasOpen ? (
          <>
            {!composerOpen && (
              <div className="flex justify-center py-2 shrink-0">
                <button
                  onClick={() => setComposerOpen(true)}
                  className="text-[11px] text-stone-600 hover:text-stone-400 transition-colors px-3 py-1 rounded-md hover:bg-white/[0.04]"
                >
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-stone-500 font-mono text-[10px] mr-1">&#8984;K</kbd>
                  to compose
                </button>
              </div>
            )}
            {composerOpen && (
              <Composer
                onSend={(content, model, thinkingBudget, effort) => sendMessage(content, model, thinkingBudget, effort)}
                disabled={isStreaming || !ready}
                onClose={() => setComposerOpen(false)}
              />
            )}
          </>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4">
            <ChatInput
              onSend={(content, model, thinkingBudget, effort) => sendMessage(content, model, thinkingBudget, effort)}
              disabled={isStreaming || !ready}
              variant="glass"
            />
          </div>
        )
      )}

      {/* Status bar — glass treatment */}
      {(inputTok > 0 || isStreaming) && (
        <div className="flex items-center justify-between px-4 py-1.5 glass border-x-0 border-b-0 text-[11px] text-stone-500 shrink-0">
          <div className="flex items-center gap-3">
            <span>↑{formatTokens(inputTok)}</span>
            <span>↓{formatTokens(outputTok)}</span>
            {cacheTok > 0 && <span>cache:{formatTokens(cacheTok)}</span>}
            <span className="text-amber-500">{formatCost(cost)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVerboseOpen(true)}
              className="hover:text-stone-300 transition-colors"
              title="Verbose output (Ctrl+O)"
            >
              <kbd className="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[9px]">⌃O</kbd>
            </button>
            {isStreaming && (
              <span className="text-amber-400 animate-pulse">streaming...</span>
            )}
          </div>
        </div>
      )}

      {/* Verbose output modal */}
      {verboseOpen && (
        <VerboseOutput segments={segments} lastToolCalls={lastToolCalls} onClose={() => setVerboseOpen(false)} />
      )}
    </div>
  );
}
