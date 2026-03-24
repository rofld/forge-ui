'use client';

import { useState, useRef, useEffect } from 'react';

interface FilePickerDropdownProps {
  query: string;
  onSelect: (path: string) => void;
  onClose: () => void;
  selectedIndex?: number;
}

export default function FilePickerDropdown({ query, onSelect, onClose, selectedIndex = 0 }: FilePickerDropdownProps) {
  const [results, setResults] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const url = `http://localhost:3142/files/list?path=${encodeURIComponent('/home/ubuntu/forge')}${query ? `&query=${encodeURIComponent(query)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setResults(data.entries?.map((e: { name: string }) => e.name) ?? []);
        }
      } catch { /* */ }
    }, 100);
    return () => clearTimeout(t);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const visible = results.slice(0, 12);

  return (
    <div ref={ref} className="absolute left-0 right-0 bottom-full mb-2 bg-background border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 animate-fade-in">
      <div className="px-3 py-1.5 text-[10px] text-stone-500 uppercase tracking-widest border-b border-border flex items-center justify-between">
        <span>@ File</span>
        <span className="text-[9px] text-stone-600 normal-case tracking-normal">↑↓ Enter</span>
      </div>
      {visible.length === 0 && (
        <div className="px-3 py-2 text-xs text-stone-500">{query ? 'No matches' : 'Type to search...'}</div>
      )}
      {visible.map((n, i) => (
        <button
          key={n}
          data-idx={i}
          onClick={() => onSelect(n)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
            i === selectedIndex ? 'bg-amber-500/10 text-foreground' : 'text-foreground/70 hover:bg-white/[0.04]'
          }`}
        >
          <span className="text-stone-500">{n.endsWith('/') ? '📁' : '📄'}</span>
          <span className="font-mono truncate">{n}</span>
        </button>
      ))}
    </div>
  );
}
