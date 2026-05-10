// diff-viewer.tsx — Renders a unified diff with per-line colour coding
// and per-file syntax highlighting via highlight.js.
//
// File boundaries are detected from `diff --git a/…` or `+++ b/…` headers.
// Language is inferred from the file extension. Lines beyond MAX_HIGHLIGHT_LINES
// are rendered without highlighting to keep DOM size reasonable.
'use client';

import hljs from 'highlight.js/lib/core';

// Register only the languages we care about to keep bundle size down.
import rust from 'highlight.js/lib/languages/rust';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml'; // html
import markdown from 'highlight.js/lib/languages/markdown';
import yaml from 'highlight.js/lib/languages/yaml';
import toml from 'highlight.js/lib/languages/ini'; // hljs uses ini for TOML

hljs.registerLanguage('rust', rust);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('toml', toml);

// ── Language detection ──────────────────────────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  rs: 'rust',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  json: 'json',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  css: 'css',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  md: 'markdown',
  mdx: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
};

function detectLanguage(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? null;
}

// ── Diff line types ─────────────────────────────────────────────────────────

type LineKind = 'add' | 'del' | 'hunk' | 'file' | 'context';

function classifyLine(line: string): LineKind {
  if (line.startsWith('+++') || line.startsWith('---')) return 'file';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'del';
  return 'context';
}

const KIND_BG: Record<LineKind, string> = {
  add:     'bg-green-950/30',
  del:     'bg-red-950/20',
  hunk:    'bg-cyan-950/20',
  file:    '',
  context: '',
};

const KIND_MARKER_CLASS: Record<LineKind, string> = {
  add:     'text-green-400',
  del:     'text-red-400',
  hunk:    'text-cyan-400',
  file:    'text-stone-300 font-semibold',
  context: 'text-stone-500',
};

// Max diff lines that receive hljs processing. Beyond this, fall back to plain styling.
const MAX_HIGHLIGHT_LINES = 5000;

// ── Highlight helper ────────────────────────────────────────────────────────

/**
 * Run hljs on `code` with the given `language`.
 * Returns highlighted HTML, or null if hljs throws (unknown language, etc.).
 */
function highlightCode(code: string, language: string): string | null {
  try {
    return hljs.highlight(code, { language }).value;
  } catch {
    return null;
  }
}

// ── Per-line rendering ──────────────────────────────────────────────────────

interface RenderedLine {
  key: number;
  kind: LineKind;
  /** marker character ('+', '-', ' ', etc.) — empty for file/hunk lines */
  marker: string;
  /** highlighted HTML for the body, or null → use plain text */
  html: string | null;
  /** plain text body (used when html is null) */
  plain: string;
}

function buildRenderedLines(lines: string[], language: string | null): RenderedLine[] {
  const highlight = language !== null && lines.length <= MAX_HIGHLIGHT_LINES;

  return lines.map((line, i) => {
    const kind = classifyLine(line);

    if (kind === 'file' || kind === 'hunk') {
      return { key: i, kind, marker: '', html: null, plain: line || ' ' };
    }

    // For add/del/context lines, split the marker from the body.
    const isContentLine = kind === 'add' || kind === 'del' || kind === 'context';
    const marker = isContentLine ? line[0] ?? '' : '';
    const body = isContentLine ? line.slice(1) : line;

    let html: string | null = null;
    if (highlight && body.trim()) {
      html = highlightCode(body, language!);
    }

    return { key: i, kind, marker, html, plain: body };
  });
}

// ── DiffViewer ───────────────────────────────────────────────────────────────

interface DiffViewerProps {
  diff: string;
  className?: string;
}

export function DiffViewer({ diff, className = '' }: DiffViewerProps) {
  if (!diff.trim()) {
    return (
      <div className={`text-stone-500 italic text-sm p-4 ${className}`}>
        (empty diff)
      </div>
    );
  }

  const lines = diff.split('\n');
  const truncated = lines.length > MAX_HIGHLIGHT_LINES;
  const visibleLines = truncated ? lines.slice(0, MAX_HIGHLIGHT_LINES) : lines;

  // Detect language from the first `+++ b/<path>` or `diff --git a/<path>` header.
  let language: string | null = null;
  for (const line of visibleLines) {
    const gitMatch = line.match(/^diff --git a\/.+ b\/(.+)$/);
    if (gitMatch) { language = detectLanguage(gitMatch[1]); break; }
    const plusMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (plusMatch) { language = detectLanguage(plusMatch[1]); break; }
  }

  const rendered = buildRenderedLines(visibleLines, language);

  return (
    <div
      className={`overflow-auto font-mono text-[12px] leading-relaxed rounded bg-black/30 p-3 ${className}`}
    >
      {/* hljs theme override — inline style for tokens so Tailwind purge doesn't affect them */}
      <style>{`
        .hljs-keyword   { color: #c792ea; }
        .hljs-built_in  { color: #82aaff; }
        .hljs-type      { color: #ffcb6b; }
        .hljs-literal   { color: #ff5572; }
        .hljs-number    { color: #f78c6c; }
        .hljs-string    { color: #c3e88d; }
        .hljs-regexp    { color: #ff5572; }
        .hljs-comment   { color: #546e7a; font-style: italic; }
        .hljs-punctuation { color: #89ddff; }
        .hljs-meta      { color: #ffcb6b; }
        .hljs-attr      { color: #ffcb6b; }
        .hljs-variable  { color: #f07178; }
        .hljs-title     { color: #82aaff; }
        .hljs-section   { color: #82aaff; }
        .hljs-tag       { color: #f07178; }
        .hljs-name      { color: #f07178; }
        .hljs-attribute { color: #c792ea; }
        .hljs-params    { color: #a6accd; }
        .hljs-addition  { color: #c3e88d; }
        .hljs-deletion  { color: #f07178; }
        .hljs-emphasis  { font-style: italic; }
        .hljs-strong    { font-weight: bold; }
      `}</style>

      {rendered.map(({ key, kind, marker, html, plain }) => (
        <div
          key={key}
          className={`whitespace-pre-wrap break-all ${KIND_BG[kind]}`}
        >
          {/* Marker character (+/-/space) keeps its kind colour */}
          {marker && (
            <span className={KIND_MARKER_CLASS[kind]}>{marker}</span>
          )}

          {/* Body: highlighted or plain */}
          {html !== null ? (
            <span
              className={kind === 'context' ? 'text-stone-400' : ''}
              // hljs output is sanitized — no user-controlled HTML reaches here.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <span className={KIND_MARKER_CLASS[kind]}>
              {plain || ' '}
            </span>
          )}
        </div>
      ))}

      {truncated && (
        <div className="mt-2 text-amber-500/70 text-[11px]">
          … diff truncated at {MAX_HIGHLIGHT_LINES.toLocaleString()} lines (syntax highlighting disabled beyond this point)
        </div>
      )}
    </div>
  );
}
