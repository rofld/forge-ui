'use client';

import { useState, useMemo } from 'react';
import ToolCall from './ToolCall';
import type { ToolSegment } from '@/lib/use-sse';

const TOOL_ICONS: Record<string, string> = {
  Bash: '⌘', Read: '📄', Write: '✏️', Edit: '✂️', Glob: '🔍',
  Grep: '🔎', Agent: '🤖', ToolSearch: '🔧', ShareContext: '📡',
  ThreadRecall: '🧠',
};

interface ToolCallGroupProps {
  tools: ToolSegment[];
}

export default function ToolCallGroup({ tools }: ToolCallGroupProps) {
  // Split agents from regular tools
  const agentTools = tools.filter((t) => t.name === 'Agent');
  const regularTools = tools.filter((t) => t.name !== 'Agent');

  return (
    <div className="space-y-1.5">
      {regularTools.length > 0 && (
        <CollapsibleGroup tools={regularTools} label="tools" />
      )}
      {agentTools.map((t) => (
        <AgentCallCard key={t.id} tool={t} />
      ))}
    </div>
  );
}

function CollapsibleGroup({ tools, label }: { tools: ToolSegment[]; label: string }) {
  const anyRunning = tools.some((t) => t.status === 'running');
  const [expanded, setExpanded] = useState(anyRunning);

  const successCount = tools.filter((t) => t.status === 'success').length;
  const errorCount = tools.filter((t) => t.status === 'error').length;
  const runningCount = tools.filter((t) => t.status === 'running').length;

  const totalDur = useMemo(() => {
    const ends = tools.filter((t) => t.endTime).map((t) => t.endTime!);
    if (ends.length === 0) return 0;
    const maxEnd = Math.max(...ends);
    const minStart = Math.min(...tools.map((t) => t.startTime));
    return maxEnd - minStart;
  }, [tools]);

  const durStr = totalDur > 0
    ? totalDur < 1000 ? `${totalDur}ms` : `${(totalDur / 1000).toFixed(1)}s`
    : '';

  // Auto-expand when tools start running, keep expanded while running
  if (anyRunning && !expanded) {
    // Don't call setState in render — use key trick below
  }

  return (
    <div>
      {/* Group header — always visible, clickable to toggle */}
      <button
        onClick={() => setExpanded((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-left ${
          anyRunning ? 'glass animate-shimmer' : 'glass hover:bg-white/[0.06]'
        }`}
      >
        <span
          className="text-stone-600 text-[10px] transition-transform shrink-0"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>

        {/* Tool icons strip */}
        <span className="flex items-center gap-0.5 text-xs">
          {tools.map((t) => {
            const icon = TOOL_ICONS[t.name] ?? '⚡';
            return (
              <span
                key={t.id}
                className={`${t.status === 'running' ? 'animate-pulse' : ''} ${t.status === 'error' ? 'opacity-50' : ''}`}
                title={`${t.name}${t.status === 'error' ? ' (failed)' : ''}`}
              >
                {icon}
              </span>
            );
          })}
        </span>

        <span className="text-[11px] text-stone-500">
          {tools.length} {label}
        </span>

        {/* Status counts */}
        <span className="flex items-center gap-1.5 text-[10px] ml-auto">
          {runningCount > 0 && (
            <span className="text-amber-400 animate-pulse">⟳{runningCount}</span>
          )}
          {successCount > 0 && (
            <span className="text-emerald-400">✓{successCount}</span>
          )}
          {errorCount > 0 && (
            <span className="text-red-400">✗{errorCount}</span>
          )}
          {durStr && (
            <span className="text-stone-600">{durStr}</span>
          )}
        </span>
      </button>

      {/* Expanded: show individual tool calls */}
      {expanded && (
        <div className="ml-3 mt-1 space-y-1 border-l border-white/[0.06] pl-2">
          {tools.map((t) => (
            <ToolCall key={t.id} tool={t} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Agent sub-agent card — separate from regular tools */
function AgentCallCard({ tool }: { tool: ToolSegment }) {
  const [open, setOpen] = useState(tool.status === 'running');
  const isRunning = tool.status === 'running';
  const inp = tool.input as Record<string, unknown> | undefined;
  const prompt = inp?.prompt ? String(inp.prompt).slice(0, 120) : '';
  const model = inp?.model ? String(inp.model) : '';

  const duration = tool.durationMs != null
    ? tool.durationMs < 1000 ? `${tool.durationMs}ms` : `${(tool.durationMs / 1000).toFixed(1)}s`
    : tool.endTime ? `${((tool.endTime - tool.startTime) / 1000).toFixed(1)}s` : '';

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
          isRunning ? 'bg-amber-500/[0.04] animate-shimmer' : 'hover:bg-white/[0.04]'
        }`}
      >
        <span className={`text-sm ${isRunning ? 'animate-pulse' : ''}`}>🤖</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-200">Agent</span>
            {model && <span className="text-[10px] text-stone-500 font-mono">{model}</span>}
            {isRunning && <span className="text-amber-400 text-[10px] animate-pulse">running...</span>}
            {tool.status === 'success' && <span className="text-emerald-400 text-[10px]">✓</span>}
            {tool.status === 'error' && <span className="text-red-400 text-[10px]">✗</span>}
            {duration && <span className="text-stone-600 text-[10px]">{duration}</span>}
          </div>
          {prompt && (
            <div className="text-[11px] text-stone-500 truncate mt-0.5">{prompt}</div>
          )}
        </div>
        <span className="text-stone-600 text-[10px]" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
      </button>

      {open && (
        <div className="border-t border-white/[0.04] px-3 py-2 bg-black/20">
          {isRunning && !tool.output && (
            <div className="flex items-center gap-2 text-[11px] text-amber-400/60 py-1">
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 bg-amber-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-amber-500/50 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                <span className="w-1 h-1 bg-amber-500/50 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              </span>
              sub-agent working...
            </div>
          )}
          {tool.output && (
            <div className="text-[11px] text-stone-400 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {tool.output}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
