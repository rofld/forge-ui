// log-stream-pane.tsx — Live log viewer with ANSI colour rendering.
// Renders up to 1000 lines as a scrollable list.
// Auto-scrolls to the bottom unless the user has scrolled up.
// Keyboard: End → jump to bottom, Home → jump to top.
//
// Full react-window virtualisation is deferred — render up to 1000 lines as
// a regular overflow-y-auto list which handles realistic agent log volumes.
'use client';

import { useEffect, useRef, useCallback, KeyboardEvent } from 'react';

// ── ANSI-to-HTML inline parser ──────────────────────────────────────────────
// Handles the most common SGR codes used by terminal tools.
// Unrecognised codes are stripped silently.

const ANSI_RESET = '\x1b[0m';

const SGR_TO_CLASS: Record<number, string> = {
  // Weights
  1: 'font-bold',
  2: 'opacity-60',
  3: 'italic',
  4: 'underline',
  // Foreground colours (standard 8)
  30: 'text-stone-800',
  31: 'text-red-400',
  32: 'text-green-400',
  33: 'text-amber-400',
  34: 'text-blue-400',
  35: 'text-purple-400',
  36: 'text-cyan-400',
  37: 'text-stone-300',
  // Bright foreground
  90: 'text-stone-500',
  91: 'text-red-300',
  92: 'text-green-300',
  93: 'text-yellow-300',
  94: 'text-blue-300',
  95: 'text-purple-300',
  96: 'text-cyan-300',
  97: 'text-white',
};

interface Span {
  classes: string;
  text: string;
}

function parseAnsi(raw: string): Span[] {
  // Split on ESC[ sequences
  const parts = raw.split(/\x1b\[([0-9;]*)m/);
  const spans: Span[] = [];
  let currentClasses: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Text segment
      if (parts[i]) {
        spans.push({ classes: currentClasses.join(' '), text: parts[i] });
      }
    } else {
      // SGR code(s)
      const codes = parts[i] === '' ? [0] : parts[i].split(';').map(Number);
      if (codes.includes(0)) {
        currentClasses = [];
      }
      for (const code of codes) {
        if (code === 0) continue;
        const cls = SGR_TO_CLASS[code];
        if (cls && !currentClasses.includes(cls)) {
          currentClasses.push(cls);
        }
      }
    }
  }
  return spans;
}

function AnsiLine({ line }: { line: string }) {
  const spans = parseAnsi(line);
  if (spans.length === 0) return <span>&nbsp;</span>;
  return (
    <>
      {spans.map((s, i) =>
        s.classes ? (
          <span key={i} className={s.classes}>
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

// ── LogStreamPane ──────────────────────────────────────────────────────────

const MAX_LINES = 1000;

interface LogStreamPaneProps {
  /** Raw log lines to render. Caller is responsible for capping at MAX_LINES. */
  lines: string[];
  /** Whether the SSE source is currently connected. */
  connected: boolean;
  className?: string;
}

export function LogStreamPane({ lines, connected, className = '' }: LogStreamPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);

  // Render at most MAX_LINES lines
  const visibleLines = lines.length > MAX_LINES ? lines.slice(-MAX_LINES) : lines;

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Auto-scroll on new content only when pinned to bottom
  useEffect(() => {
    if (pinnedToBottomRef.current) {
      scrollToBottom();
    }
  }, [visibleLines.length, scrollToBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    pinnedToBottomRef.current = atBottom;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.key === 'End') {
      e.preventDefault();
      pinnedToBottomRef.current = true;
      scrollToBottom();
    } else if (e.key === 'Home') {
      e.preventDefault();
      pinnedToBottomRef.current = false;
      el.scrollTop = 0;
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Connection status bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            connected ? 'bg-green-400 animate-pulse' : 'bg-stone-600'
          }`}
        />
        <span className="text-[11px] font-mono text-stone-500">
          {connected ? 'streaming' : 'disconnected'} · {visibleLines.length} lines
          {lines.length > MAX_LINES && (
            <span className="ml-1 text-amber-500/70">
              (showing last {MAX_LINES} of {lines.length})
            </span>
          )}
        </span>
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        role="log"
        aria-live="polite"
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-y-auto font-mono text-[12px] leading-relaxed p-3 bg-black/30 rounded-b focus:outline-none focus:ring-1 focus:ring-violet-500/40"
      >
        {visibleLines.length === 0 ? (
          <span className="text-stone-600 italic">
            {connected ? 'Waiting for log output…' : 'No logs yet.'}
          </span>
        ) : (
          visibleLines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              <AnsiLine line={line} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
