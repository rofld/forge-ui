'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, ContentBlock } from '@/lib/types';

interface MessageBubbleProps {
  message: Message;
}

function extractText(content: string | ContentBlock[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');
}

function extractToolUses(content: string | ContentBlock[]): ContentBlock[] {
  if (typeof content === 'string') return [];
  return content.filter((b) => b.type === 'tool_use');
}

function extractToolResults(content: string | ContentBlock[]): ContentBlock[] {
  if (typeof content === 'string') return [];
  return content.filter((b) => b.type === 'tool_result');
}

function ToolUseBlock({ block }: { block: ContentBlock }) {
  const [open, setOpen] = useState(false);
  const input = block.input
    ? JSON.stringify(block.input, null, 2)
    : null;

  return (
    <div className="my-1 font-mono text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <span className="text-zinc-600">{open ? '▾' : '▸'}</span>
        <span className="text-zinc-500">⟶</span>
        <span className="text-zinc-300">{block.name}</span>
        <span className="text-emerald-400">✓</span>
      </button>
      {open && input && (
        <div className="ml-5 mt-1 p-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {input}
        </div>
      )}
    </div>
  );
}

function ToolResultBlock({ block }: { block: ContentBlock }) {
  const [open, setOpen] = useState(false);
  const text =
    typeof block.content === 'string'
      ? block.content
      : Array.isArray(block.content)
      ? block.content.map((b) => (typeof b === 'string' ? b : b.text ?? '')).join('')
      : '';

  if (!text) return null;

  return (
    <div className="my-1 font-mono text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
          block.is_error ? 'text-red-400' : 'text-zinc-500'
        } hover:text-zinc-300`}
      >
        <span className="text-zinc-600">{open ? '▾' : '▸'}</span>
        <span>{block.is_error ? '✗ error' : '◦ result'}</span>
      </button>
      {open && (
        <div className="ml-5 mt-1 p-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {text}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const text = extractText(message.content);
  const toolUses = extractToolUses(message.content);
  const toolResults = extractToolResults(message.content);

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-6 h-6 rounded flex items-center justify-center font-mono text-xs mt-0.5 ${
          isUser ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800 text-zinc-400'
        }`}
      >
        {isUser ? 'U' : 'A'}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        {isUser ? (
          <div className="bg-zinc-800 text-zinc-100 rounded px-3 py-2 font-mono text-sm whitespace-pre-wrap">
            {text}
          </div>
        ) : (
          <div className="text-zinc-200 text-sm leading-relaxed">
            {text && (
              <div className="prose prose-invert prose-sm max-w-none
                prose-p:text-zinc-200 prose-p:my-1
                prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:rounded prose-code:text-xs
                prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:text-xs
                prose-headings:text-zinc-100 prose-headings:font-mono
                prose-a:text-blue-400
                prose-li:text-zinc-200
                prose-strong:text-zinc-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {text}
                </ReactMarkdown>
              </div>
            )}
            {toolUses.map((t) => (
              <ToolUseBlock key={t.id} block={t} />
            ))}
            {toolResults.map((t, i) => (
              <ToolResultBlock key={t.id ?? i} block={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
