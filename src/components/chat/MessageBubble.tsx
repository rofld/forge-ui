'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useMarkdownComponents } from '@/components/chat/FileLink';
import { proseClasses } from '@/lib/prose';
import type { Message, ContentBlock } from '@/lib/types';

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

const TOOL_ICONS: Record<string, string> = {
  Bash: '⌘', Read: '📄', Write: '✏️', Edit: '✂️', Glob: '🔍',
  Grep: '🔎', Agent: '🤖', ToolSearch: '🔧', ShareContext: '📡',
  ThreadRecall: '🧠',
};

function ToolUseBlock({ block }: { block: ContentBlock }) {
  const [open, setOpen] = useState(false);
  const input = block.input ? JSON.stringify(block.input, null, 2) : null;
  const inp = block.input as Record<string, unknown> | undefined;
  const icon = TOOL_ICONS[block.name ?? ''] ?? '⚡';

  // Build a nice preview based on tool type
  let preview = '';
  if (block.name === 'Bash' && inp?.command) preview = String(inp.command);
  else if (block.name === 'Read' && inp?.file_path) preview = String(inp.file_path).split('/').slice(-2).join('/');
  else if (block.name === 'Write' && inp?.file_path) preview = String(inp.file_path).split('/').slice(-2).join('/');
  else if (block.name === 'Edit' && inp?.file_path) preview = String(inp.file_path).split('/').slice(-2).join('/');
  else if (block.name === 'Glob' && inp?.pattern) preview = String(inp.pattern);
  else if (block.name === 'Grep' && inp?.pattern) preview = String(inp.pattern);
  else if (inp?.path) preview = String(inp.path);

  return (
    <div className="animate-fade-in-up">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg glass hover:bg-white/[0.06] transition-all cursor-pointer group text-left"
      >
        <span className="text-sm shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-200">{block.name}</span>
            <span className="text-amber-500 text-[10px]">✓</span>
          </div>
          {preview && (
            <div className="text-[11px] text-stone-500 truncate mt-0.5 font-normal">
              {preview}
            </div>
          )}
        </div>
        <span className="text-stone-600 group-hover:text-stone-400 text-[10px] transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      </button>
      {open && input && (
        <div className="animate-expand ml-2 mt-1 mb-2 p-3 rounded-lg bg-black/30 border border-white/[0.04] text-stone-400 text-[11px] whitespace-pre-wrap max-h-64 overflow-y-auto">
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
      ? block.content.map((b: unknown) => (typeof b === 'string' ? b : (b as { text?: string }).text ?? '')).join('')
      : '';

  if (!text) return null;

  const lines = text.split('\n');
  const previewLines = lines.slice(0, 3).join('\n');
  const hasMore = lines.length > 3;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left px-3 py-2 rounded-lg transition-all cursor-pointer text-xs ${
          block.is_error
            ? 'bg-red-500/5 border border-red-500/10 hover:bg-red-500/10'
            : 'bg-emerald-500/5 border border-emerald-500/8 hover:bg-emerald-500/10'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className={block.is_error ? 'text-red-400' : 'text-emerald-400'}>
            {block.is_error ? '✗' : '✓'}
          </span>
          <span className={`font-medium ${block.is_error ? 'text-red-400' : 'text-emerald-400'}`}>
            {block.is_error ? 'Error' : 'Result'}
          </span>
          {hasMore && !open && (
            <span className="text-stone-600 ml-auto">{lines.length} lines</span>
          )}
        </div>
        <div className="text-stone-500 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
          {open ? text : previewLines}
          {hasMore && !open && <span className="text-stone-600"> ...</span>}
        </div>
      </button>
    </div>
  );
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const text = extractText(message.content);
  const toolUses = extractToolUses(message.content);
  const toolResults = extractToolResults(message.content);
  const markdownComponents = useMarkdownComponents();

  // Skip rendering empty user messages (tool_results with no visible text)
  const isToolResultOnly = isUser && !text.trim() && typeof message.content !== 'string' && Array.isArray(message.content);
  if (isToolResultOnly) return null;

  // Skip system/continuation messages with no content
  if (isUser && !text.trim()) return null;

  return (
    <div className={`py-2 ${isUser ? 'animate-slide-right' : 'animate-slide-left'}`}>
      {isUser ? (
        <div className="flex justify-end">
          <div className="bg-gradient-to-br from-white/[0.09] to-white/[0.04] backdrop-blur-sm text-stone-100 rounded-2xl rounded-tr-md px-4 py-3 text-sm whitespace-pre-wrap border border-white/[0.08] shadow-lg shadow-black/10 max-w-[80%]">
            {text}
          </div>
        </div>
      ) : (
        <div className="text-sm leading-relaxed">
          {text && (
            <div className={proseClasses}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
                {text}
              </ReactMarkdown>
            </div>
          )}
          {toolUses.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {toolUses.map((t) => (
                <ToolUseBlock key={t.id} block={t} />
              ))}
            </div>
          )}
          {toolResults.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {toolResults.map((t, i) => (
                <ToolResultBlock key={t.id ?? i} block={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
