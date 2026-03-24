'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getPoolWorkChat,
  postPoolWorkChat,
  poolWorkChatSSE,
  type WorkChatMessage,
} from '@/lib/api';

interface Props {
  poolId: string;
}

export default function WorkChatPanel({ poolId }: Props) {
  const [messages, setMessages] = useState<WorkChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sseError, setSseError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load initial messages + SSE stream
  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;

    async function init() {
      try {
        const data = await getPoolWorkChat(poolId);
        if (!cancelled) setMessages(data.messages ?? []);
      } catch {
        // pool may not have workchat yet
      }

      if (cancelled) return;

      // Start SSE for live updates
      es = poolWorkChatSSE(poolId);
      es.addEventListener('workchat', (event: MessageEvent) => {
        if (cancelled) return;
        setSseError(false);
        try {
          const msg: WorkChatMessage = JSON.parse(event.data);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } catch { /* ignore parse errors */ }
      });

      es.onerror = () => {
        if (!cancelled) setSseError(true);
      };
    }

    init();
    return () => { cancelled = true; es?.close(); };
  }, [poolId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [sendError, setSendError] = useState(false);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(false);
    const saved = text;
    setInput('');
    try {
      await postPoolWorkChat(poolId, text);
    } catch {
      setInput(saved); // restore input on failure
      setSendError(true);
      setTimeout(() => setSendError(false), 3000);
    } finally {
      setSending(false);
    }
  }

  function formatType(t: string) {
    switch (t) {
      case 'question': return '? ';
      case 'error': return '! ';
      case 'escalation': return '!! ';
      default: return '';
    }
  }

  function typeColor(t: string) {
    switch (t) {
      case 'question': return 'text-amber-400';
      case 'error': return 'text-red-400';
      case 'escalation': return 'text-red-500';
      case 'coordination': return 'text-emerald-400';
      case 'steering': return 'text-blue-400';
      default: return 'text-zinc-400';
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
        {sseError && (
          <div className="text-amber-500/70 text-center py-1 text-[10px]">connection lost — retrying…</div>
        )}
        {messages.length === 0 && !sseError && (
          <div className="text-zinc-600 py-4 text-center">No messages yet</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2">
            <span className="text-zinc-600 shrink-0">{m.timestamp?.slice(11, 19) ?? ''}</span>
            <span className={`shrink-0 font-bold ${m.from === 'human' ? 'text-blue-400' : 'text-zinc-300'}`}>
              {formatType(m.msg_type)}{m.from}
            </span>
            <span className={typeColor(m.msg_type)}>{m.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-2 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Send message to agents..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 text-xs font-mono disabled:opacity-30 transition-colors"
        >
          Send
        </button>
        {sendError && <span className="text-red-400 text-[10px] self-center">failed</span>}
      </div>
    </div>
  );
}
