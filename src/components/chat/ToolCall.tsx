'use client';

import { useState, useEffect } from 'react';
import type { ToolSegment } from '@/lib/use-sse';

const TOOL_ICONS: Record<string, string> = {
  Bash: '⌘', Read: '📄', Write: '✏️', Edit: '✂️', Glob: '🔍',
  Grep: '🔎', Agent: '🤖', ToolSearch: '🔧', ShareContext: '📡',
  ThreadRecall: '🧠',
};

function formatInput(name: string, input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const inp = input as Record<string, unknown>;
  if (name === 'Bash' && inp.command) {
    const cmd = String(inp.command);
    return cmd.length > 80 ? cmd.slice(0, 77) + '...' : cmd;
  }
  if ((name === 'Read' || name === 'Write' || name === 'Edit') && inp.file_path)
    return String(inp.file_path).split('/').slice(-2).join('/');
  if (name === 'Glob' && inp.pattern) return String(inp.pattern);
  if (name === 'Grep' && inp.pattern) return String(inp.pattern);
  if (name === 'Agent' && inp.prompt) return String(inp.prompt).slice(0, 60);
  if (name === 'ShareContext' && inp.name) return String(inp.name);
  if (name === 'ToolSearch' && inp.query) return String(inp.query);
  if (inp.path) return String(inp.path);
  return '';
}

/** Render Edit tool diff showing removed/added lines */
function EditDiff({ input }: { input: unknown }) {
  if (!input || typeof input !== 'object') return null;
  const inp = input as Record<string, unknown>;
  const oldStr = inp.old_string ? String(inp.old_string) : '';
  const newStr = inp.new_string ? String(inp.new_string) : '';
  if (!oldStr && !newStr) return null;

  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const maxLines = 8;

  return (
    <div className="mt-1 text-[11px] font-mono">
      {oldLines.slice(0, maxLines).map((line, i) => (
        <div key={`r-${i}`} className="text-red-400/70 bg-red-500/[0.04] px-2 py-px">
          <span className="text-red-500/40 mr-1.5 select-none">−</span>{line}
        </div>
      ))}
      {oldLines.length > maxLines && (
        <div className="text-stone-600 px-2 py-px">  ... {oldLines.length - maxLines} more lines</div>
      )}
      {newLines.slice(0, maxLines).map((line, i) => (
        <div key={`a-${i}`} className="text-emerald-400/70 bg-emerald-500/[0.04] px-2 py-px">
          <span className="text-emerald-500/40 mr-1.5 select-none">+</span>{line}
        </div>
      ))}
      {newLines.length > maxLines && (
        <div className="text-stone-600 px-2 py-px">  ... {newLines.length - maxLines} more lines</div>
      )}
    </div>
  );
}

/** Render Write tool with line count */
function WriteInfo({ input }: { input: unknown }) {
  if (!input || typeof input !== 'object') return null;
  const inp = input as Record<string, unknown>;
  const content = inp.content ? String(inp.content) : '';
  const lines = content.split('\n').length;
  return (
    <span className="text-[10px] text-stone-500 ml-2">{lines} lines</span>
  );
}

export default function ToolCall({ tool }: { tool: ToolSegment }) {
  const [open, setOpen] = useState(false);
  const [wasRunning, setWasRunning] = useState(false);
  const icon = TOOL_ICONS[tool.name] ?? '⚡';
  const isRunning = tool.status === 'running';
  const preview = formatInput(tool.name, tool.input);

  const duration = tool.durationMs != null
    ? tool.durationMs < 1000
      ? `${tool.durationMs}ms`
      : `${(tool.durationMs / 1000).toFixed(1)}s`
    : tool.endTime != null
      ? ((tool.endTime - tool.startTime) / 1000).toFixed(1) + 's'
      : null;

  useEffect(() => {
    if (isRunning) {
      setWasRunning(true);
      setOpen(true);
    } else if (wasRunning) {
      const timer = setTimeout(() => setOpen(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isRunning, wasRunning]);

  const outputLines = tool.output?.split('\n') ?? [];
  const hasMoreOutput = outputLines.length > 8;
  const [showFull, setShowFull] = useState(false);

  const isEdit = tool.name === 'Edit';
  const isWrite = tool.name === 'Write';

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer group text-left ${
          isRunning ? 'glass animate-shimmer' : 'glass hover:bg-white/[0.06]'
        }`}
      >
        <span className={`text-xs shrink-0 ${isRunning ? 'animate-pulse' : ''}`}>{icon}</span>
        <span className="text-xs font-semibold text-stone-200 shrink-0">{tool.name}</span>
        {preview && (
          <span className="text-[11px] text-stone-500 truncate font-mono">{preview}</span>
        )}
        {isWrite && <WriteInfo input={tool.input} />}
        <span className="flex items-center gap-1.5 ml-auto shrink-0">
          {isRunning && (
            <span className="text-amber-400 text-[10px] animate-pulse">running...</span>
          )}
          {tool.status === 'success' && (
            <span className="text-emerald-400 text-[10px]">✓</span>
          )}
          {tool.status === 'error' && (
            <span className="text-red-400 text-[10px]">✗</span>
          )}
          {duration && (
            <span className="text-stone-600 text-[10px]">{duration}</span>
          )}
          {!!(tool.output || tool.input) && (
            <span
              className="text-stone-600 group-hover:text-stone-400 text-[10px] transition-transform"
              style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              ▶
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="ml-3 mt-0.5 rounded-lg border overflow-hidden">
          {/* Edit tool: show diff */}
          {isEdit && tool.input != null && (
            <div className="border-b border-white/[0.04]">
              <EditDiff input={tool.input as Record<string, unknown>} />
            </div>
          )}

          {/* Output or running indicator */}
          {(tool.output || isRunning) && (
            <div className={`p-2.5 text-[11px] whitespace-pre-wrap font-mono ${
              tool.status === 'error'
                ? 'bg-red-500/5 border-red-500/10 text-red-300'
                : 'bg-black/20 text-stone-400'
            }`}>
              {isRunning && !tool.output && (
                <div className="flex items-center gap-2 text-amber-400/60">
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 bg-amber-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-amber-500/50 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                    <span className="w-1 h-1 bg-amber-500/50 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  </span>
                </div>
              )}
              {tool.output && (
                <div className="max-h-48 overflow-y-auto">
                  {showFull || !hasMoreOutput ? tool.output : outputLines.slice(0, 8).join('\n')}
                  {hasMoreOutput && !showFull && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowFull(true); }}
                      className="block mt-1 text-stone-600 hover:text-stone-400 text-[10px]"
                    >
                      ↓ {outputLines.length} lines total
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
