'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SharedContextProps {
  entries: { agent: string; content: string }[];
}

export default function SharedContext({ entries }: SharedContextProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(agent: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(agent)) next.delete(agent);
      else next.add(agent);
      return next;
    });
  }

  if (entries.length === 0) {
    return (
      <div className="p-4 text-zinc-600 font-mono text-xs">No shared context yet.</div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800">
      {entries.map((e) => (
        <div key={e.agent}>
          <button
            onClick={() => toggle(e.agent)}
            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-zinc-900 transition-colors"
          >
            <span className="text-zinc-600 font-mono text-xs">
              {expanded.has(e.agent) ? '▾' : '▸'}
            </span>
            <span className="font-mono text-xs font-bold text-zinc-300">{e.agent}</span>
          </button>

          {expanded.has(e.agent) && (
            <div className="px-4 pb-3">
              <div className="prose prose-invert prose-sm max-w-none
                prose-p:text-zinc-300 prose-p:my-1
                prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:rounded prose-code:text-xs
                prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:text-xs
                prose-headings:text-zinc-100 prose-headings:font-mono
                prose-li:text-zinc-300
                prose-strong:text-zinc-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.content}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
