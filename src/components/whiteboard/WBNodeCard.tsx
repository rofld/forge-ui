'use client';

import { useState, useRef, useEffect } from 'react';
import { useCanvas } from '@/lib/canvas-context';
import type { WBNode } from './types';

interface Props {
  node: WBNode;
  onStartDrag: (id: string, offsetX: number, offsetY: number) => void;
  onUpdate: (id: string, updates: Partial<WBNode>) => void;
  onDelete: (id: string) => void;
  zoom: number;
}

export default function WBNodeCard({ node, onStartDrag, onUpdate, onDelete, zoom }: Props) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { openFile } = useCanvas();

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [editing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editing) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = (e.clientX - rect.left) / zoom;
    const offsetY = (e.clientY - rect.top) / zoom;
    onStartDrag(node.id, offsetX, offsetY);
  };

  if (node.type === 'heading') {
    return (
      <div
        className="absolute select-none"
        style={{ left: node.x, top: node.y, width: node.width }}
        onMouseDown={handleMouseDown}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      >
        {editing ? (
          <input
            value={node.content}
            onChange={(e) => onUpdate(node.id, { content: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false); }}
            className="w-full bg-transparent text-foreground text-lg font-bold focus:outline-none border-b-2 border-amber-500/30 pb-1"
            autoFocus
          />
        ) : (
          <div className="text-foreground text-lg font-bold border-b-2 border-white/[0.06] pb-1 cursor-move">
            {node.content || 'Heading'}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              className="ml-2 text-stone-600 hover:text-red-400 text-xs opacity-0 hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'file') {
    return (
      <div
        className="absolute select-none"
        style={{ left: node.x, top: node.y, width: node.width }}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-white/[0.02]">
            <span className="text-[11px]">📄</span>
            <span className="text-[11px] font-mono text-foreground/80 truncate flex-1">{node.content || 'file'}</span>
            <button
              onClick={(e) => { e.stopPropagation(); if (node.filePath) openFile(node.filePath); }}
              className="text-[10px] text-amber-400 hover:text-amber-300"
            >
              open
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              className="text-stone-600 hover:text-red-400 text-xs"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Note card
  const borderColor = node.color || '#f59e0b';

  return (
    <div
      className="absolute select-none group"
      style={{ left: node.x, top: node.y, width: node.width, minHeight: node.height }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      <div
        className="h-full rounded-lg shadow-lg overflow-hidden bg-background border-l-[3px]"
        style={{ borderLeftColor: borderColor, borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1 bg-white/[0.02] cursor-move">
          <div className="flex gap-1">
            {['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899'].map((c) => (
              <button
                key={c}
                onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { color: c }); }}
                className={`w-2.5 h-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${node.color === c ? 'ring-1 ring-white/30' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            className="text-stone-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-3 py-2">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={node.content}
              onChange={(e) => onUpdate(node.id, { content: e.target.value })}
              onBlur={() => setEditing(false)}
              className="w-full bg-transparent text-foreground text-xs resize-none focus:outline-none min-h-[80px]"
              style={{ height: Math.max(80, node.height - 40) }}
            />
          ) : (
            <div className={`text-xs whitespace-pre-wrap min-h-[80px] ${node.content ? 'text-foreground/80' : 'text-stone-600 italic'}`}>
              {node.content || 'Double-click to edit...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
