'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { StreamSegment, ToolSegment } from '@/lib/use-sse';

interface VerboseOutputProps {
  segments: StreamSegment[];
  lastToolCalls?: ToolSegment[];
  onClose: () => void;
}

function formatToolVerbose(tool: ToolSegment, index: number): string {
  const lines: string[] = [];
  const status = tool.status === 'success' ? '✓' : tool.status === 'error' ? '✗' : '⟳';
  const dur = tool.durationMs != null
    ? tool.durationMs < 1000 ? `${tool.durationMs}ms` : `${(tool.durationMs / 1000).toFixed(1)}s`
    : tool.endTime ? `${((tool.endTime - tool.startTime) / 1000).toFixed(1)}s` : '';

  lines.push(`[${index + 1}] ${status} ${tool.name}${dur ? `  (${dur})` : ''}`);
  lines.push('─'.repeat(50));

  // Input — formatted by tool type
  if (tool.input && typeof tool.input === 'object') {
    const inp = tool.input as Record<string, unknown>;

    // Show the primary argument prominently
    if (tool.name === 'Bash' && inp.command) {
      lines.push(`  $ ${String(inp.command)}`);
    } else if ((tool.name === 'Read' || tool.name === 'Write' || tool.name === 'Edit') && inp.file_path) {
      lines.push(`  file: ${String(inp.file_path)}`);
      if (inp.old_string) lines.push(`  find: ${String(inp.old_string).slice(0, 100)}${String(inp.old_string).length > 100 ? '...' : ''}`);
      if (inp.new_string) lines.push(`  replace: ${String(inp.new_string).slice(0, 100)}${String(inp.new_string).length > 100 ? '...' : ''}`);
      if (inp.content && tool.name === 'Write') lines.push(`  content: (${String(inp.content).length} chars)`);
    } else if (tool.name === 'Glob' && inp.pattern) {
      lines.push(`  pattern: ${String(inp.pattern)}`);
    } else if (tool.name === 'Grep' && inp.pattern) {
      lines.push(`  pattern: ${String(inp.pattern)}${inp.path ? `  in: ${inp.path}` : ''}`);
    } else if (tool.name === 'ShareContext') {
      if (inp.name) lines.push(`  name: ${String(inp.name)}`);
      if (inp.content) lines.push(`  content: ${String(inp.content).slice(0, 200)}${String(inp.content).length > 200 ? '...' : ''}`);
    } else if (tool.name === 'Agent' && inp.prompt) {
      lines.push(`  prompt: ${String(inp.prompt).slice(0, 200)}`);
      if (inp.model) lines.push(`  model: ${String(inp.model)}`);
    } else if (tool.name === 'ToolSearch' && inp.query) {
      lines.push(`  query: ${String(inp.query)}`);
    } else {
      // Generic fallback
      for (const [key, val] of Object.entries(inp)) {
        const str = typeof val === 'string' ? val : JSON.stringify(val);
        lines.push(`  ${key}: ${str.length > 150 ? str.slice(0, 150) + '...' : str}`);
      }
    }
  }

  // Output
  if (tool.output) {
    lines.push('');
    const outputLines = tool.output.split('\n');
    if (outputLines.length <= 30) {
      for (const ol of outputLines) {
        lines.push(`  │ ${ol}`);
      }
    } else {
      // Head + tail for long outputs
      for (const ol of outputLines.slice(0, 15)) {
        lines.push(`  │ ${ol}`);
      }
      lines.push(`  │ ... (${outputLines.length - 25} lines omitted) ...`);
      for (const ol of outputLines.slice(-10)) {
        lines.push(`  │ ${ol}`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

export default function VerboseOutput({ segments, lastToolCalls = [], onClose }: VerboseOutputProps) {
  const contentRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Use current segments if streaming, otherwise fall back to last completed tool calls
  const currentTools = segments.filter((s): s is ToolSegment => s.kind === 'tool');
  const tools = currentTools.length > 0 ? currentTools : lastToolCalls;

  // Summary line
  const successCount = tools.filter((t) => t.status === 'success').length;
  const errorCount = tools.filter((t) => t.status === 'error').length;
  const runningCount = tools.filter((t) => t.status === 'running').length;
  const totalDur = tools.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);

  const summaryParts: string[] = [];
  if (successCount > 0) summaryParts.push(`${successCount} succeeded`);
  if (errorCount > 0) summaryParts.push(`${errorCount} failed`);
  if (runningCount > 0) summaryParts.push(`${runningCount} running`);
  const summary = summaryParts.length > 0
    ? `${tools.length} tool calls (${summaryParts.join(', ')}) — ${totalDur}ms total`
    : 'No tool calls';

  const fullText = [
    '═══ Tool Call Log ═══',
    summary,
    '',
    ...tools.map((t, i) => formatToolVerbose(t, i)),
  ].join('\n');

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(fullText);
  }, [fullText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[720px] max-h-[80vh] mx-4 bg-background border border-border rounded-xl shadow-2xl shadow-black/50 flex flex-col animate-fade-in-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-foreground font-bold">Verbose Output</span>
            <span className="text-[10px] text-stone-500 font-mono">{summary}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-stone-400 hover:text-stone-200 transition-colors border border-white/[0.08]"
            >
              Copy all
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-stone-500 hover:text-stone-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <pre
          ref={contentRef}
          className="flex-1 overflow-auto p-4 text-[11px] font-mono leading-relaxed text-stone-300 select-text whitespace-pre-wrap"
        >
          {fullText}
        </pre>
      </div>
    </div>
  );
}
