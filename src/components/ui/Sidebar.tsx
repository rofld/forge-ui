'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ShardIcon from '@/components/ui/ShardIcon';
import InfinityIcon from '@/components/ui/InfinityIcon';
import ThemePicker from '@/components/ui/ThemePicker';
import { listThreads, listPools, deleteThread, createThread, renameThread } from '@/lib/api';
import { isSessionActive } from '@/lib/sse-manager';
import { shortModel } from '@/lib/format';
import type { ThreadInfo, PoolInfo } from '@/lib/types';

function useLocalStorage(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) setValue(stored === 'true');
  }, [key]);
  const set = (v: boolean) => {
    setValue(v);
    localStorage.setItem(key, String(v));
  };
  return [value, set];
}

interface SidebarProps {
  onCollapse?: () => void;
}

export default function Sidebar({ onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [threadsOpen, setThreadsOpen] = useLocalStorage('sidebar-threads', true);
  const [poolsOpen, setPoolsOpen] = useLocalStorage('sidebar-pools', false);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateThread = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const t = await createThread();
      setThreads((prev) => [t, ...prev]);
      router.push(`/threads/${t.id}`);
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (oldId: string) => {
    const newId = editValue.trim();
    setEditingId(null);
    if (!newId || newId === oldId) return;
    try {
      const updated = await renameThread(oldId, newId);
      setThreads((prev) => prev.map((t) => (t.id === oldId ? updated : t)));
      if (pathname === `/threads/${oldId}`) {
        router.push(`/threads/${updated.id}`);
      }
    } catch {
      // revert silently
    }
  };

  useEffect(() => {
    listThreads()
      .then((ts) => setThreads(ts.filter((t) => t.id !== '__global__')))
      .catch(() => {});
    listPools().then(setPools).catch(() => {});
  }, []);

  // Poll for active sessions to show running indicator
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-56 min-h-screen glass border-r border-white/[0.06] flex flex-col shrink-0 animate-fade-in">
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-3 py-3">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-1 py-1 hover:bg-white/[0.04] rounded-lg transition-colors"
        >
          <ShardIcon size={18} className="text-amber-500 -translate-y-px" />
          <span className="text-foreground font-semibold tracking-tight text-[15px]">
            shard
          </span>
        </button>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors text-stone-600 hover:text-stone-400"
            title="Collapse sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Endless mode — global thread */}
      <div className="px-2 pb-1">
        <button
          onClick={() => router.push('/')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
            pathname === '/'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
              : isSessionActive('__global__')
                ? 'text-amber-400/80 border border-amber-500/10 bg-amber-500/[0.04]'
                : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          {isSessionActive('__global__') && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          )}
          <InfinityIcon size={16} className="shrink-0" />
          <span className="text-[13px] font-medium">Endless</span>
        </button>
      </div>

      <div className="h-px bg-white/[0.06] mx-3" />

      {/* Threads */}
      <div className="pt-2">
        <div className="flex items-center justify-between px-4 py-1.5">
          <button
            onClick={() => setThreadsOpen(!threadsOpen)}
            className="flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-widest font-medium"
          >
            <span>Threads</span>
            <span className="text-[9px] opacity-60">{threadsOpen ? '▾' : '▸'}</span>
          </button>
          <button
            onClick={handleCreateThread}
            disabled={creating}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.06] text-stone-600 hover:text-amber-400 transition-colors text-sm leading-none"
            title="New thread"
          >
            +
          </button>
        </div>
        {threadsOpen && (
          <div className="px-2 pb-1 space-y-px max-h-64 overflow-y-auto animate-expand">
            {threads.map((t) => {
              const active = pathname === `/threads/${t.id}`;
              const running = isSessionActive(t.id);
              return (
                <div
                  key={t.id}
                  className={`flex items-center group px-3 py-1.5 text-[13px] rounded-lg transition-all ${
                    active
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      : running
                        ? 'text-amber-400/80 border border-amber-500/10 bg-amber-500/[0.04]'
                        : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {running && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-2 shrink-0" />
                  )}
                  {editingId === t.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleRename(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(t.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 mr-2 bg-white/[0.06] border border-white/[0.1] rounded px-1.5 py-0.5 text-[13px] text-stone-200 outline-none focus:border-amber-500/40"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <Link
                      href={`/threads/${t.id}`}
                      className="truncate flex-1 mr-2"
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        setEditingId(t.id);
                        setEditValue(t.id);
                      }}
                    >
                      {t.id}
                    </Link>
                  )}
                  <span className="text-[10px] opacity-40 shrink-0 font-mono group-hover:hidden">{shortModel(t.model)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete thread "${t.id}"?`)) {
                        const onDeleted = () => {
                          setThreads((prev) => prev.filter((x) => x.id !== t.id));
                          if (active) router.push('/');
                        };
                        deleteThread(t.id).then(onDeleted).catch((err) => {
                          const msg = String(err?.message ?? err);
                          if (msg.includes('locked by PID')) {
                            if (confirm(`Thread is in use by an active agent. Force delete?`)) {
                              deleteThread(t.id, true).then(onDeleted).catch((err2) => {
                                alert(`Failed to delete thread: ${err2?.message ?? err2}`);
                              });
                            }
                          } else {
                            alert(`Failed to delete thread: ${msg}`);
                          }
                        });
                      }
                    }}
                    className="hidden group-hover:flex shrink-0 w-5 h-5 items-center justify-center rounded hover:bg-red-500/20 text-stone-600 hover:text-red-400 transition-colors"
                    title="Delete thread"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {threads.length === 0 && (
              <div className="px-3 py-1.5 text-[12px] text-stone-600">No threads</div>
            )}
          </div>
        )}
      </div>

      {/* Pools */}
      <div className="pt-1">
        <button
          onClick={() => setPoolsOpen(!poolsOpen)}
          className="flex items-center justify-between w-full px-4 py-1.5 text-[12px] text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-widest font-medium"
        >
          <span>Pools</span>
          <span className="text-[9px] opacity-60">{poolsOpen ? '▾' : '▸'}</span>
        </button>
        {poolsOpen && (
          <div className="px-2 pb-1 space-y-px max-h-48 overflow-y-auto animate-expand">
            {pools.map((p) => {
              const active = pathname === `/pools/${p.id}`;
              return (
                <Link
                  key={p.id}
                  href={`/pools/${p.id}`}
                  className={`flex items-center justify-between px-3 py-1.5 text-[13px] rounded-lg transition-all ${
                    active
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="truncate flex-1 mr-2">{p.id}</span>
                  <span className="text-[10px] opacity-40 shrink-0 font-mono">
                    {p.agent_count > 0 ? `${p.agent_count}a` : ''}
                  </span>
                </Link>
              );
            })}
            {pools.length === 0 && (
              <div className="px-3 py-1.5 text-[12px] text-stone-600">No pools</div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="h-px bg-white/[0.06] mx-3" />

      <div className="px-1 py-2">
        <ThemePicker />
      </div>

      <div className="px-4 py-2">
        <span className="text-stone-600 text-[10px] tracking-wide uppercase font-mono">
          api :3142
        </span>
      </div>
    </aside>
  );
}
