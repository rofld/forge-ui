'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import FolderIcon from '@/components/ui/FolderIcon';

const API_BASE = process.env.NEXT_PUBLIC_FORGE_API || '${API_BASE}';
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

export default function FileExplorer() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filePath, setFilePath] = useState('/home/ubuntu/forge');
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openFile, workingDir } = useCanvas();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const loadFiles = useCallback(async (dir: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/files/list?path=${encodeURIComponent(dir)}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.entries ?? []);
        setFilePath(dir);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const toggle = useCallback(() => {
    if (!open) {
      loadFiles(workingDir || '/home/ubuntu/forge');
    }
    setOpen((o) => !o);
  }, [open, workingDir, loadFiles]);

  const navigateUp = useCallback(() => {
    const parent = filePath.replace(/\/[^/]+$/, '') || '/';
    loadFiles(parent);
  }, [filePath, loadFiles]);

  const handleClick = useCallback((entry: FileEntry) => {
    if (entry.is_dir) {
      const cleanName = entry.name.replace(/\/$/, '');
      loadFiles(`${filePath}/${cleanName}`);
    } else {
      openFile(`${filePath}/${entry.name}`);
      setOpen(false);
    }
  }, [filePath, loadFiles, openFile]);

  const downloadFile = useCallback(async (entry: FileEntry) => {
    if (entry.is_dir) return;
    try {
      const res = await fetch(`${API_BASE}/files?path=${encodeURIComponent(`${filePath}/${entry.name}`)}`);
      if (!res.ok) return;
      const data = await res.json();
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, [filePath]);

  const shortPath = filePath.replace(workingDir || '/home/ubuntu/forge', '.') || '.';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggle}
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5 hover:from-amber-500/30 hover:to-amber-600/20 cursor-pointer"
        title="Browse files"
      >
        <FolderIcon size={14} />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-72 bg-background border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in-up">
          {/* Header with path + open explorer link */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <FolderIcon size={12} className="text-amber-500 shrink-0" />
            <span className="text-[11px] text-stone-400 font-mono truncate flex-1">{shortPath}</span>
            <Link
              href="/explorer"
              onClick={() => setOpen(false)}
              className="text-[10px] text-stone-500 hover:text-stone-300 shrink-0 px-1.5 py-0.5 rounded hover:bg-white/[0.06] transition-colors"
            >
              Open Explorer
            </Link>
          </div>

          {/* File list */}
          <div className="max-h-72 overflow-y-auto">
            {filePath !== '/' && (
              <button
                onClick={navigateUp}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground/60 hover:bg-white/[0.04] transition-colors"
              >
                <span className="w-5 text-center text-stone-600">↩</span>
                <span className="font-mono">..</span>
              </button>
            )}
            {loading && <div className="px-3 py-3 text-xs text-stone-500 animate-pulse">Loading...</div>}
            {!loading && files.map((f) => (
              <div key={f.name} className="flex items-center group hover:bg-white/[0.04] transition-colors">
                <button
                  onClick={() => handleClick(f)}
                  className="flex-1 flex items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground/80 min-w-0"
                >
                  <span className="w-5 text-center text-stone-500 shrink-0">
                    {f.is_dir ? '📁' : '📄'}
                  </span>
                  <span className="font-mono truncate">{f.name}</span>
                  {!f.is_dir && (
                    <span className="text-[10px] text-stone-600 shrink-0 ml-auto">{fmtSize(f.size)}</span>
                  )}
                </button>
                {!f.is_dir && (
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadFile(f); }}
                    className="shrink-0 w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                    title="Download"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v8M8 11l-3-3M8 11l3-3M3 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {!loading && files.length === 0 && (
              <div className="px-3 py-3 text-xs text-stone-500">Empty directory</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
