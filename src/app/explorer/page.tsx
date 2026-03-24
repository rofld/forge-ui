'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import FolderIcon from '@/components/ui/FolderIcon';
import { useCanvas } from '@/lib/canvas-context';

interface FileEntry {
  name: string;
  is_dir: boolean;
  size: number;
}

function fmtSize(s: number): string {
  if (s < 1024) return `${s}B`;
  if (s < 1048576) return `${(s / 1024).toFixed(0)}K`;
  return `${(s / 1048576).toFixed(1)}M`;
}

export default function ExplorerPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filePath, setFilePath] = useState('/home/ubuntu/forge');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const { openFile, workingDir } = useCanvas();

  const loadFiles = useCallback(async (dir: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3142/files/list?path=${encodeURIComponent(dir)}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.entries ?? []);
        setFilePath(dir);
        setSelected(0);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFiles(workingDir || '/home/ubuntu/forge');
  }, [workingDir, loadFiles]);

  const navigateUp = useCallback(() => {
    const parent = filePath.replace(/\/[^/]+$/, '') || '/';
    loadFiles(parent);
  }, [filePath, loadFiles]);

  const openEntry = useCallback((entry: FileEntry) => {
    if (entry.is_dir) {
      loadFiles(`${filePath}/${entry.name.replace(/\/$/, '')}`);
    } else {
      openFile(`${filePath}/${entry.name}`);
    }
  }, [filePath, loadFiles, openFile]);

  const downloadFile = useCallback(async (entry: FileEntry) => {
    try {
      const res = await fetch(`http://localhost:3142/files?path=${encodeURIComponent(`${filePath}/${entry.name}`)}`);
      if (!res.ok) return;
      const data = await res.json();
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* */ }
  }, [filePath]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, files.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Tab') {
        // Tab goes into directory
        e.preventDefault();
        const entry = files[selected];
        if (entry?.is_dir) {
          loadFiles(`${filePath}/${entry.name.replace(/\/$/, '')}`);
        }
      } else if (e.key === 'Enter') {
        // Enter opens file in canvas
        e.preventDefault();
        const entry = files[selected];
        if (entry) openEntry(entry);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        navigateUp();
      } else if (e.key === 'Escape') {
        // handled by router
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [files, selected, filePath, loadFiles, navigateUp, openEntry]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const shortPath = filePath.replace(workingDir || '/home/ubuntu/forge', '.') || '.';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 glass border-x-0 border-t-0 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-stone-500 hover:text-stone-300 text-xs transition-colors">← Back</Link>
          <div className="w-px h-4 bg-white/[0.08]" />
          <FolderIcon size={14} className="text-amber-500" />
          <span className="text-foreground font-semibold">Explorer</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-500">
          <span>↑↓ navigate · Tab into folder · Enter open · Backspace up</span>
        </div>
      </div>

      {/* Path bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-white/[0.02]">
        <FolderIcon size={12} className="text-stone-500 shrink-0" />
        <span className="text-xs font-mono text-stone-400 truncate">{shortPath}</span>
        <button
          onClick={navigateUp}
          className="shrink-0 text-[11px] text-stone-500 hover:text-stone-300 px-1.5 py-0.5 rounded hover:bg-white/[0.06]"
        >
          ↩ Up
        </button>
      </div>

      {/* File list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading && <div className="px-4 py-3 text-xs text-stone-500 animate-pulse">Loading...</div>}
        {!loading && files.length === 0 && (
          <div className="px-4 py-6 text-xs text-stone-500 text-center">Empty directory</div>
        )}
        {!loading && files.map((f, i) => (
          <div
            key={f.name}
            data-idx={i}
            onClick={() => { setSelected(i); openEntry(f); }}
            onMouseEnter={() => setSelected(i)}
            className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors group ${
              i === selected ? 'bg-amber-500/10' : 'hover:bg-white/[0.03]'
            }`}
          >
            <span className="text-base w-6 text-center shrink-0">
              {f.is_dir ? '📁' : '📄'}
            </span>
            <span className={`font-mono text-sm flex-1 truncate ${i === selected ? 'text-foreground' : 'text-foreground/70'}`}>
              {f.name}
            </span>
            {!f.is_dir && (
              <>
                <span className="text-[10px] text-stone-600 font-mono shrink-0">{fmtSize(f.size)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadFile(f); }}
                  className="shrink-0 w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Download"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v8M8 11l-3-3M8 11l3-3M3 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
            {f.is_dir && (
              <span className="text-[10px] text-stone-600 shrink-0 opacity-0 group-hover:opacity-100">Tab →</span>
            )}
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border text-[11px] text-stone-500 shrink-0">
        <span>{files.length} items</span>
        <span className="font-mono">{filePath}</span>
      </div>
    </div>
  );
}
