'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import WhiteboardCanvas from '@/components/whiteboard/WhiteboardCanvas';
import type { WBNode } from '@/components/whiteboard/types';

const STORAGE_KEY = 'forge-whiteboard';

function loadNodes(): WBNode[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNodes(nodes: WBNode[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
}

export default function WhiteboardPage() {
  const [nodes, setNodes] = useState<WBNode[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (!loaded.current) {
      setNodes(loadNodes());
      loaded.current = true;
    }
  }, []);

  const updateNodes = useCallback((updater: (prev: WBNode[]) => WBNode[]) => {
    setNodes((prev) => {
      const next = updater(prev);
      saveNodes(next);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 glass border-x-0 border-t-0 shrink-0">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-stone-500 hover:text-stone-300 text-xs transition-colors">← Back</Link>
          <div className="w-px h-4 bg-white/[0.08]" />
          <span className="text-foreground font-semibold">Whiteboard</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-500">
          <span>Scroll to zoom · Drag to pan · Double-click to add note</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <WhiteboardCanvas nodes={nodes} setNodes={updateNodes} />
      </div>
    </div>
  );
}
