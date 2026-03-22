'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ToolCall from './ToolCall';
import type { ToolCallState } from '@/lib/use-sse';

interface StreamingTextProps {
  text: string;
  activeTools?: ToolCallState[];
}

export default function StreamingText({ text, activeTools = [] }: StreamingTextProps) {
  const hasContent = text || activeTools.length > 0;
  if (!hasContent) return null;

  return (
    <div className="flex gap-3 mb-4">
      <div className="shrink-0 w-6 h-6 rounded flex items-center justify-center font-mono text-xs mt-0.5 bg-zinc-800 text-zinc-400">
        A
      </div>
      <div className="flex-1 max-w-3xl text-zinc-200 text-sm leading-relaxed">
        {activeTools.map((t) => (
          <ToolCall key={t.id} tool={t} />
        ))}
        {text && (
          <div className="prose prose-invert prose-sm max-w-none
            prose-p:text-zinc-200 prose-p:my-1
            prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:rounded prose-code:text-xs
            prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:text-xs
            prose-headings:text-zinc-100 prose-headings:font-mono
            prose-a:text-blue-400
            prose-li:text-zinc-200
            prose-strong:text-zinc-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-pulse ml-0.5 align-middle" />
          </div>
        )}
      </div>
    </div>
  );
}
