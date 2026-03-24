'use client';

import { useEffect, useRef, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { getThread, getMessages, uploadSharedContext, saveWhiteboardContext, steerThread } from '@/lib/api';
import { shortModel, formatTokens, estimateCost, formatCost } from '@/lib/format';
import { useSSE } from '@/lib/use-sse';
import { useCanvas } from '@/lib/canvas-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ShardIcon from '@/components/ui/ShardIcon';
import InfinityIcon from '@/components/ui/InfinityIcon';
import MessageBubble from '@/components/chat/MessageBubble';
import StreamingText from '@/components/chat/StreamingText';
import ChatInput from '@/components/chat/ChatInput';
import Composer from '@/components/chat/Composer';
import VerboseOutput from '@/components/chat/VerboseOutput';
import ShardMenu from '@/components/chat/ShardMenu';
import FileExplorer from '@/components/files/FileExplorer';
import KnowledgePanel from '@/components/knowledge/KnowledgePanel';
import WhiteboardCanvas from '@/components/whiteboard/WhiteboardCanvas';
import type { ThreadDetail, Message } from '@/lib/types';
import type { WBNode } from '@/components/whiteboard/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ThreadPage({ params }: Props) {
  const { id } = use(params);

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'whiteboard'>('chat');

  // Whiteboard state — per-thread localStorage key
  const WB_KEY = `forge-whiteboard-${id}`;
  const [wbNodes, setWbNodes] = useState<WBNode[]>([]);
  const wbLoaded = useRef(false);
  const wbSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!wbLoaded.current && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(WB_KEY);
        setWbNodes(raw ? JSON.parse(raw) : []);
      } catch { /* ignore */ }
      wbLoaded.current = true;
    }
  }, [WB_KEY]);

  const updateWbNodes = useCallback((updater: (prev: WBNode[]) => WBNode[]) => {
    setWbNodes((prev) => {
      const next = updater(prev);
      localStorage.setItem(WB_KEY, JSON.stringify(next));
      // Debounced context sync to API
      if (wbSaveTimer.current) clearTimeout(wbSaveTimer.current);
      wbSaveTimer.current = setTimeout(() => {
        saveWhiteboardContext(id, next).catch(() => {/* ignore if API unavailable */});
      }, 2000);
      return next;
    });
  }, [WB_KEY, id]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [verboseOpen, setVerboseOpen] = useState(false);
  const { isOpen: canvasOpen, setWorkingDir, file: canvasFile, refresh: refreshCanvas } = useCanvas();

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const result = await uploadSharedContext(id, file);
      setUploadToast(`Uploaded: ${result.name}`);
      setTimeout(() => setUploadToast(null), 3000);
    } catch (e) {
      setUploadToast(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(() => setUploadToast(null), 4000);
    }
  }, [id]);

  const {
    messages,
    isStreaming,
    segments,
    lastToolCalls,
    tokenStats,
    error,
    sendMessage,
    setMessages,
  } = useSSE(id, initialMessages);

  useEffect(() => {
    async function load() {
      try {
        const [td, msgs] = await Promise.allSettled([
          getThread(id),
          getMessages(id),
        ]);
        if (td.status === 'fulfilled') {
          setThread(td.value);
          if (td.value.working_dir && td.value.working_dir !== '.') {
            setWorkingDir(td.value.working_dir);
          }
        } else {
          setLoadError(td.reason?.message ?? String(td.reason));
        }

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

  const model = thread?.model ?? '';
  const inputTok = tokenStats?.input_tokens ?? thread?.total_input_tokens ?? 0;
  const outputTok = tokenStats?.output_tokens ?? thread?.total_output_tokens ?? 0;
  const cacheTok = tokenStats?.cache_read_tokens ?? 0;
  const cost = estimateCost(model, inputTok, outputTok, cacheTok);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Header — glass */}
      <div className="flex items-center justify-between px-4 py-2.5 glass border-x-0 border-t-0 shrink-0">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link href="/threads">
            <Button variant="ghost" size="sm" className="text-xs text-stone-500 hover:text-stone-300 px-2">
              ← Back
            </Button>
          </Link>
          <div className="w-px h-4 bg-white/[0.08]" />
          <ShardMenu
            onAction={(prompt) => sendMessage(prompt, thread?.model)}
            disabled={isStreaming}
          />
          <FileExplorer />
          <span className="text-stone-100 font-semibold truncate">{id}</span>
          {thread && (
            <>
              <Badge variant="secondary" className="text-[10px] shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                {shortModel(thread.model)}
              </Badge>
              <span className="text-[11px] text-stone-500">{thread.provider}</span>
            </>
          )}
          {/* Tab navigation */}
          <div className="flex items-center gap-0.5 ml-2">
            {(['Chat', 'Knowledge', 'Whiteboard'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase() as 'chat' | 'knowledge' | 'whiteboard')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  activeTab === tab.toLowerCase()
                    ? 'bg-white/[0.08] text-stone-200'
                    : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {thread && activeTab === 'chat' && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-stone-500 hover:text-amber-400 transition-colors"
                title="Upload shared context file"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M11 5L8 2 5 5M8 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                    e.target.value = '';
                  }
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Upload toast */}
      {uploadToast && (
        <div className="absolute top-14 right-4 z-50 px-3 py-2 glass border-amber-500/20 rounded-lg text-[12px] text-amber-300 animate-fade-in">
          {uploadToast}
        </div>
      )}

      {/* Tab: Chat */}
      {activeTab === 'chat' && (
        <>
          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-3xl mx-auto space-y-1">
              {!initialLoaded && (
                <div className="text-stone-500 text-xs animate-pulse">Loading messages...</div>
              )}
              {loadError && (
                <div className="text-red-400 text-xs mb-4 p-3 glass border-red-500/20 rounded-lg">
                  Could not load thread: {loadError}
                </div>
              )}
              {initialLoaded && messages.length === 0 && !isStreaming && !loadError && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="flex items-center gap-3 mb-6">
                    <ShardIcon size={40} className="text-amber-500/40" />
                    <span className="text-stone-600 text-2xl font-light">/</span>
                    <InfinityIcon size={36} className="text-amber-500/30" />
                  </div>
                  <p className="text-stone-200 text-base font-medium">{id}</p>
                  <p className="text-stone-500 text-xs mt-2">
                    Start a conversation — context persists across sessions
                  </p>
                </div>
              )}
              {messages.map((msg, i) => {
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
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input: ChatInput when no canvas, Composer when canvas open */}
          {canvasOpen ? (
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
                  disabled={isStreaming}
                  onClose={() => setComposerOpen(false)}
                  defaultModel={thread?.model ? thread.model.replace(/^claude-/, '').split('-')[0] : 'opus'}
                />
              )}
            </>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4">
              <ChatInput
                onSend={(content, model, thinkingBudget, effort) => sendMessage(content, model, thinkingBudget, effort)}
                disabled={isStreaming}
                variant="glass"
                defaultModel={thread?.model ? thread.model.replace(/^claude-/, '').split('-')[0] : 'opus'}
              />
            </div>
          )}

          {/* Status bar — glass */}
          <div className="flex items-center justify-between px-4 py-1.5 glass border-x-0 border-b-0 text-[11px] text-stone-500 shrink-0">
            <div className="flex items-center gap-3">
              <span title="Input tokens">↑{formatTokens(inputTok)}</span>
              <span title="Output tokens">↓{formatTokens(outputTok)}</span>
              {cacheTok > 0 && (
                <span title="Cache read">cache:{formatTokens(cacheTok)}</span>
              )}
              <span className="text-amber-500" title="Estimated cost">
                {formatCost(cost)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setVerboseOpen(true)}
                className="hover:text-stone-300 transition-colors"
                title="Verbose output (Ctrl+O)"
              >
                <kbd className="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[9px]">⌃O</kbd>
              </button>
              {thread && (
                <span>op:{thread.total_operations}</span>
              )}
              {isStreaming && (
                <SteeringInput threadId={id} />
              )}
              {isStreaming && (
                <span className="text-amber-400 animate-pulse">streaming...</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tab: Knowledge */}
      {activeTab === 'knowledge' && (
        <div className="flex-1 overflow-hidden">
          <KnowledgePanel threadId={id} />
        </div>
      )}

      {/* Tab: Whiteboard */}
      {activeTab === 'whiteboard' && (
        <div className="flex-1 overflow-hidden">
          <WhiteboardCanvas nodes={wbNodes} setNodes={updateWbNodes} />
        </div>
      )}

      {/* Verbose output modal */}
      {verboseOpen && (
        <VerboseOutput segments={segments} lastToolCalls={lastToolCalls} onClose={() => setVerboseOpen(false)} />
      )}
    </div>
  );
}

/** Inline steering input — send follow-up while agent is streaming */
function SteeringInput({ threadId }: { threadId: string }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function handleSteer() {
    const msg = text.trim();
    if (!msg) return;
    try {
      await steerThread(threadId, msg);
      setText('');
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSteer(); }}
        placeholder="follow-up..."
        className="w-32 bg-transparent border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
      />
      {status === 'sent' && <span className="text-emerald-500 text-[10px]">sent</span>}
      {status === 'error' && <span className="text-red-400 text-[10px]">failed</span>}
    </div>
  );
}
