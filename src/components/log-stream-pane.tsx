// log-stream-pane.tsx — Live log viewer with ANSI colour rendering.
// Virtualises the line list with react-window 2.x `List` (fixed 20 px row height).
// Auto-scrolls to the bottom unless the user has scrolled up.
// Keyboard: End → jump to bottom, Home → jump to top.
//
// Trade-off: fixed 20 px per row is accurate for single-line agent log entries.
// Multi-line ANSI strings (rare in practice) are clipped to their first visual row
// inside the virtualised window; callers should pre-split lines on `\n` if needed.
'use client';

import { useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { List, useListRef, ListImperativeAPI } from 'react-window';

// ── ANSI-to-HTML inline parser ──────────────────────────────────────────────
// Handles the most common SGR codes used by terminal tools.
// Unrecognised codes are stripped silently.

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

// ── Row height constant ──────────────────────────────────────────────────────
// Fixed 20 px covers the `font-mono text-[12px] leading-relaxed` line height.
// Adjust if the container font or line-height changes.
const ROW_HEIGHT = 20;

// ── LogRow — react-window 2.x rowComponent ──────────────────────────────────
// react-window 2.x injects ariaAttributes/index/style automatically.
// Extra data is passed via `rowProps` — must NOT overlap with the injected keys.

interface LogRowExtraProps {
  lines: string[];
}

type LogRowProps = {
  ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
  index: number;
  style: React.CSSProperties;
} & LogRowExtraProps;

function LogRow({ ariaAttributes, index, style, lines }: LogRowProps) {
  const line = lines[index] ?? '';
  return (
    <div
      {...ariaAttributes}
      style={style}
      className="whitespace-pre-wrap break-all px-3"
    >
      <AnsiLine line={line} />
    </div>
  );
}

// ── LogStreamPane ──────────────────────────────────────────────────────────

interface LogStreamPaneProps {
  /** Raw log lines to render. No length limit — virtualisation handles large counts. */
  lines: string[];
  /** Whether the SSE source is currently connected. */
  connected: boolean;
  className?: string;
}

export function LogStreamPane({ lines, connected, className = '' }: LogStreamPaneProps) {
  // useListRef is typed as typeof useRef<ListImperativeAPI>; pass null as initial value.
  const listRef = useListRef(null);
  const pinnedToBottomRef = useRef(true);

  // Auto-scroll to bottom when new lines arrive (if pinned)
  useEffect(() => {
    if (pinnedToBottomRef.current && lines.length > 0) {
      listRef.current?.scrollToRow({ index: lines.length - 1, align: 'end' });
    }
  }, [lines.length, listRef]);

  // Detect whether the user has scrolled away from the bottom
  const handleScroll = useCallback(
    (event: Event) => {
      const el = event.currentTarget as HTMLElement;
      if (!el) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
      pinnedToBottomRef.current = atBottom;
    },
    [],
  );

  // Attach/detach native scroll listener on the outermost List element
  const prevElRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // listRef.current.element is available after first render
    const el = listRef.current?.element ?? null;
    if (el === prevElRef.current) return;
    if (prevElRef.current) {
      prevElRef.current.removeEventListener('scroll', handleScroll);
    }
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
    }
    prevElRef.current = el;
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'End') {
      e.preventDefault();
      pinnedToBottomRef.current = true;
      listRef.current?.scrollToRow({ index: lines.length - 1, align: 'end' });
    } else if (e.key === 'Home') {
      e.preventDefault();
      pinnedToBottomRef.current = false;
      listRef.current?.scrollToRow({ index: 0, align: 'start' });
    }
  };

  return (
    <div
      className={`flex flex-col h-full ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="log"
      aria-live="polite"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
    >
      {/* Connection status bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            connected ? 'bg-green-400 animate-pulse' : 'bg-stone-600'
          }`}
        />
        <span className="text-[11px] font-mono text-stone-500">
          {connected ? 'streaming' : 'disconnected'} · {lines.length} lines
        </span>
      </div>

      {/* Log content */}
      {lines.length === 0 ? (
        <div className="flex-1 flex items-start p-3 bg-black/30 rounded-b">
          <span className="text-stone-600 italic font-mono text-[12px]">
            {connected ? 'Waiting for log output…' : 'No logs yet.'}
          </span>
        </div>
      ) : (
        <div className="flex-1 bg-black/30 rounded-b overflow-hidden focus:outline-none focus:ring-1 focus:ring-violet-500/40">
          <List<LogRowExtraProps>
            listRef={listRef}
            rowCount={lines.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={LogRow}
            rowProps={{ lines }}
            className="font-mono text-[12px] leading-relaxed"
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      )}
    </div>
  );
}
