'use client';

import { useCanvas } from '@/lib/canvas-context';
import type { Components } from 'react-markdown';
import type { ReactNode } from 'react';

const FILE_PATH_REGEX = /^(?:\/[\w.@-]+)+(?:\/[\w.@-]+)*$|^(?:\.\/|src\/|\.\.\/)?[\w.@-]+(?:\/[\w.@-]+)*\.\w+$/;

function looksLikePath(text: string): boolean {
  if (text.startsWith('/') || text.startsWith('./') || text.startsWith('../')) {
    return FILE_PATH_REGEX.test(text);
  }
  if (text.includes('/') && /\.\w{1,10}$/.test(text) && !text.includes(' ')) {
    return FILE_PATH_REGEX.test(text);
  }
  return false;
}

/** Check if text looks like a file or directory name (e.g. CLAUDE.md, forge-core/, Cargo.toml) */
function looksLikeFileName(text: string): boolean {
  const trimmed = text.replace(/\/$/, ''); // strip trailing slash for dirs
  if (trimmed.includes(' ') || trimmed.length > 60) return false;
  // Has extension
  if (/^[\w.@-]+\.\w{1,10}$/.test(trimmed)) return true;
  // Ends with / (directory)
  if (text.endsWith('/') && /^[\w.@-]+$/.test(trimmed)) return true;
  return false;
}

export function useMarkdownComponents(): Partial<Components> {
  const { openFile } = useCanvas();

  return {
    code: ({ children, className, ...props }) => {
      const text = String(children).replace(/\n$/, '');

      if (!className && looksLikePath(text)) {
        return (
          <button
            onClick={() => openFile(text)}
            className="text-amber-400 bg-amber-500/[0.06] px-1 py-px rounded text-xs font-mono border border-amber-500/[0.08] hover:underline hover:bg-amber-500/[0.12] cursor-pointer transition-colors"
          >
            {text}
          </button>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },

    // Make table rows interactive — detect file/dir names in cells
    tr: ({ children, ...props }) => {
      // Extract text content from cells to find file names
      let fileName: string | null = null;

      // children are <td> elements — check each for file-like names
      const cells = Array.isArray(children) ? children : [children];
      for (const cell of cells) {
        if (!cell || typeof cell !== 'object') continue;
        const cellProps = (cell as { props?: { children?: ReactNode } }).props;
        if (!cellProps?.children) continue;
        const cellText = extractText(cellProps.children);
        if (cellText && looksLikeFileName(cellText)) {
          fileName = cellText;
          break;
        }
      }

      if (fileName) {
        const name = fileName;
        return (
          <tr
            {...props}
            onClick={() => {
              // For directories, we can't open them — skip
              if (name.endsWith('/')) return;
              openFile(name);
            }}
            className={`${name.endsWith('/') ? '' : 'cursor-pointer hover:bg-amber-500/[0.06]'} transition-colors`}
          >
            {children}
          </tr>
        );
      }

      return <tr {...props}>{children}</tr>;
    },
  };
}

/** Recursively extract plain text from React children */
function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children.trim();
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('').trim();
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}
