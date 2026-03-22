'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArchiveEntryProps {
  title: string;
  content: string;
  badge?: string;
}

export default function ArchiveEntry({ title, content, badge }: ArchiveEntryProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2 shrink-0">
        <span className="font-mono text-sm text-zinc-100">{title}</span>
        {badge && (
          <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-xs font-mono rounded">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-invert prose-sm max-w-none
          prose-p:text-zinc-300 prose-p:my-2
          prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:rounded prose-code:text-xs
          prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:text-xs
          prose-headings:text-zinc-100 prose-headings:font-mono prose-headings:mt-4
          prose-a:text-blue-400
          prose-li:text-zinc-300
          prose-strong:text-zinc-100
          prose-hr:border-zinc-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
