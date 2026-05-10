// diff-viewer.tsx — Renders a unified diff with per-line colour coding.
// Lines prefixed + are green, - are red, @@ headers are cyan, context is dimmed.
// Full syntax-aware highlighting per language is deferred to a follow-up
// (would require parsing the diff header for file extension + calling hljs per hunk).
'use client';

interface DiffViewerProps {
  diff: string;
  className?: string;
}

type LineKind = 'add' | 'del' | 'hunk' | 'file' | 'context';

function classifyLine(line: string): LineKind {
  if (line.startsWith('+++') || line.startsWith('---')) return 'file';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'del';
  return 'context';
}

const KIND_CLASS: Record<LineKind, string> = {
  add:     'text-green-400 bg-green-950/30',
  del:     'text-red-400 bg-red-950/30',
  hunk:    'text-cyan-400 bg-cyan-950/20',
  file:    'text-stone-300 font-semibold',
  context: 'text-stone-500',
};

export function DiffViewer({ diff, className = '' }: DiffViewerProps) {
  if (!diff.trim()) {
    return (
      <div className={`text-stone-500 italic text-sm p-4 ${className}`}>
        (empty diff)
      </div>
    );
  }

  const lines = diff.split('\n');

  return (
    <div
      className={`overflow-auto font-mono text-[12px] leading-relaxed rounded bg-black/30 p-3 ${className}`}
    >
      {lines.map((line, i) => {
        const kind = classifyLine(line);
        return (
          <div key={i} className={`whitespace-pre-wrap break-all ${KIND_CLASS[kind]}`}>
            {line || ' '}
          </div>
        );
      })}
    </div>
  );
}
