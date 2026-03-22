'use client';

import { useState } from 'react';
import type { ToolCallState } from '@/lib/use-sse';

interface ToolCallProps {
  tool: ToolCallState;
}

const STATUS_STYLE = {
  running: 'text-amber-400',
  success: 'text-emerald-400',
  error:   'text-red-400',
};

const STATUS_ICON = {
  running: '◌',
  success: '✓',
  error:   '✗',
};

export default function ToolCall({ tool }: ToolCallProps) {
  const [open, setOpen] = useState(false);
  const duration =
    tool.endTime != null
      ? ((tool.endTime - tool.startTime) / 1000).toFixed(2) + 's'
      : null;

  return (
    <div className="my-0.5 font-mono text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <span className="text-zinc-600">{open ? '▾' : '▸'}</span>
        <span className="text-zinc-500">⟶</span>
        <span className="text-zinc-300">{tool.name}</span>
        <span className={STATUS_STYLE[tool.status]}>
          {STATUS_ICON[tool.status]}
        </span>
        {duration && (
          <span className="text-zinc-600">({duration})</span>
        )}
      </button>

      {open && tool.output && (
        <div className="ml-5 mt-1 p-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto text-xs">
          {tool.output}
        </div>
      )}
    </div>
  );
}
