'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ShardIcon from '@/components/ui/ShardIcon';

interface ShardMenuProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPT_ITEMS = [
  { icon: '🏗️', label: 'Project overview', prompt: 'Give me a high-level overview of this project — architecture, key files, tech stack, and entry points.' },
  { icon: '📊', label: 'Git status', prompt: 'Show the current git status, recent commits (last 5), and current branch.' },
  { icon: '🔧', label: 'Available tools', prompt: 'List all the tools you have available and briefly describe what each one does.' },
];

export default function ShardMenu({ onAction, disabled }: ShardMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'search' | 'knowledge'>('menu');
  const [inputValue, setInputValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setView('menu');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (view === 'search' || view === 'knowledge') inputRef.current?.focus();
  }, [view]);

  const submitInput = useCallback(() => {
    if (!inputValue.trim()) return;
    if (view === 'search') {
      onAction(`Search the codebase for "${inputValue.trim()}" — show file paths and matching lines.`);
    } else if (view === 'knowledge') {
      onAction(`Use the ShareContext tool to save the following to the knowledge base:\n\n${inputValue.trim()}`);
    }
    setOpen(false);
    setView('menu');
    setInputValue('');
  }, [view, inputValue, onAction]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setOpen((o) => !o); setView('menu'); }}
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5 hover:from-amber-500/30 hover:to-amber-600/20 cursor-pointer"
        title="Quick actions"
      >
        <ShardIcon size={15} />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-64 bg-background border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in-up">
          {view === 'menu' && (
            <>
              <div className="px-3 py-2 text-[10px] text-stone-500 uppercase tracking-widest font-medium border-b border-border">
                Quick actions
              </div>
              <button onClick={() => { setView('search'); setInputValue(''); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] text-foreground/70 hover:bg-white/[0.06] transition-colors">
                <span className="text-sm w-5 text-center">🔍</span><span>Search code</span>
              </button>
              <button onClick={() => { setView('knowledge'); setInputValue(''); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] text-foreground/70 hover:bg-white/[0.06] transition-colors">
                <span className="text-sm w-5 text-center">🧠</span><span>Save to knowledge</span>
              </button>
              {PROMPT_ITEMS.map((item) => (
                <button key={item.label} onClick={() => { onAction(item.prompt); setOpen(false); }} disabled={disabled}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] text-foreground/70 hover:bg-white/[0.06] transition-colors disabled:opacity-40">
                  <span className="text-sm w-5 text-center">{item.icon}</span><span>{item.label}</span>
                </button>
              ))}
            </>
          )}

          {(view === 'search' || view === 'knowledge') && (
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setView('menu')} className="text-[11px] text-stone-500 hover:text-stone-300">←</button>
                <span className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">
                  {view === 'search' ? 'Search code' : 'Save to knowledge'}
                </span>
              </div>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitInput();
                  if (e.key === 'Escape') setView('menu');
                }}
                placeholder={view === 'search' ? 'pattern or keyword...' : 'what to remember...'}
                className="w-full bg-white/[0.06] border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-stone-500 focus:outline-none focus:border-amber-500/30"
              />
              <div className="flex justify-end mt-2">
                <button onClick={submitInput}
                  className="text-[11px] px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/20">
                  Go
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
