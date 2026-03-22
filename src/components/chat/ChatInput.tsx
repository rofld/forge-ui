'use client';

import { useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message… (Cmd+Enter to send)',
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const val = ref.current?.value.trim();
    if (!val || disabled) return;
    onSend(val);
    if (ref.current) ref.current.value = '';
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex gap-2 p-3 border-t border-zinc-800 bg-zinc-950">
      <textarea
        ref={ref}
        rows={1}
        disabled={disabled}
        placeholder={disabled ? 'Thinking…' : 'Message… (Shift+Enter for newline)'}
        onKeyDown={handleKey}
        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-700"
      >
        {disabled ? '…' : 'Send'}
      </button>
    </div>
  );
}
