'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import ToolCallGroup from './ToolCallGroup';
import { useMarkdownComponents } from '@/components/chat/FileLink';
import { proseClasses } from '@/lib/prose';
import type { StreamSegment, ToolSegment } from '@/lib/use-sse';

interface StreamingTextProps {
  segments: StreamSegment[];
  isStreaming: boolean;
}

/** Group consecutive tool segments */
function groupSegments(segments: StreamSegment[]): (StreamSegment | { kind: 'tool-group'; tools: ToolSegment[] })[] {
  const result: (StreamSegment | { kind: 'tool-group'; tools: ToolSegment[] })[] = [];
  let currentToolGroup: ToolSegment[] = [];
  for (const seg of segments) {
    if (seg.kind === 'tool') {
      currentToolGroup.push(seg);
    } else {
      if (currentToolGroup.length > 0) {
        result.push({ kind: 'tool-group', tools: [...currentToolGroup] });
        currentToolGroup = [];
      }
      result.push(seg);
    }
  }
  if (currentToolGroup.length > 0) {
    result.push({ kind: 'tool-group', tools: currentToolGroup });
  }
  return result;
}

/**
 * Split markdown into blocks at double-newline boundaries.
 * Returns [completedBlocks, activeBlock].
 * Completed blocks won't change — safe to memoize.
 */
function splitBlocks(content: string): [string[], string] {
  // Split on double newlines (paragraph boundaries)
  const parts = content.split(/\n\n/);
  if (parts.length <= 1) return [[], content];
  const completed = parts.slice(0, -1);
  const active = parts[parts.length - 1];
  return [completed, active];
}

/** Memoized completed block — renders once, never re-renders */
const CompletedBlock = memo(function CompletedBlock({ content, index }: { content: string; index: number }) {
  const markdownComponents = useMarkdownComponents();
  return (
    <div className="animate-block-in">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

/** Incremental markdown — completed blocks are frozen, only active block re-renders */
function IncrementalMarkdown({ content, isActivelyStreaming }: { content: string; isActivelyStreaming: boolean }) {
  const markdownComponents = useMarkdownComponents();

  const [completedBlocks, activeBlock] = useMemo(
    () => isActivelyStreaming ? splitBlocks(content) : [[], content],
    // Only recompute completed blocks when a new paragraph boundary appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isActivelyStreaming ? content.lastIndexOf('\n\n') : content, isActivelyStreaming]
  );

  if (!isActivelyStreaming) {
    // Not streaming — render everything normally
    return (
      <div className={proseClasses}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={proseClasses}>
      {/* Completed blocks — memoized, won't re-render */}
      {completedBlocks.map((block, i) => (
        <CompletedBlock key={`b-${i}-${block.slice(0, 20)}`} content={block} index={i} />
      ))}

      {/* Active block — updates on every throttled delta */}
      {activeBlock && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
          {activeBlock}
        </ReactMarkdown>
      )}

      {/* Cursor */}
      <span className="inline-block w-1.5 h-4 bg-amber-500/70 rounded-sm animate-pulse ml-0.5 align-middle" />
    </div>
  );
}

export default function StreamingText({ segments, isStreaming }: StreamingTextProps) {
  if (segments.length === 0) return null;

  const grouped = groupSegments(segments);

  return (
    <div className="py-2">
      <div className="leading-relaxed space-y-1.5">
        {grouped.map((seg, i) => {
          if (seg.kind === 'thinking') {
            return (
              <div key="thinking" className="flex items-center gap-3 py-3 px-3 rounded-lg glass text-xs text-stone-400">
                <div className="shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="animate-pulse">Reasoning...</span>
              </div>
            );
          }

          if (seg.kind === 'tool-group') {
            return <ToolCallGroup key={`tg-${i}`} tools={seg.tools} />;
          }

          if (seg.kind === 'text') {
            return (
              <IncrementalMarkdown
                key={`text-${i}`}
                content={seg.content}
                isActivelyStreaming={isStreaming && i === grouped.length - 1}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
