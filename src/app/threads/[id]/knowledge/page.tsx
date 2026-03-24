'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { getArchives, getMemories, listSharedContext, postMessage } from '@/lib/api';
import ArchiveEntry from '@/components/knowledge/ArchiveEntry';
import MemoryEditor from '@/components/knowledge/MemoryEditor';
import SharedContextEditor from '@/components/knowledge/SharedContextEditor';
import Composer from '@/components/chat/Composer';
import type { Archives, Memory } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

interface SharedEntry {
  name: string;
  content: string;
}

type SelectedItem =
  | { kind: 'l2' }
  | { kind: 'l1'; index: number }
  | { kind: 'l0'; index: number }
  | { kind: 'memories' }
  | { kind: 'shared'; index: number }
  | { kind: 'shared-all' };

export default function KnowledgePage({ params }: Props) {
  const { id } = use(params);

  const [archives, setArchives] = useState<Archives | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [shared, setShared] = useState<SharedEntry[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [agentWorking, setAgentWorking] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);

  // Send a message to the agent to modify knowledge
  const sendToAgent = useCallback(async (prompt: string) => {
    setAgentWorking(true);
    setAgentStatus('Agent working...');
    try {
      const response = await postMessage(id, prompt);
      if (!response.ok) throw new Error(`${response.status}`);
      // Consume the SSE stream to completion
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      setAgentStatus('Done — refreshing...');
      // Reload knowledge data
      const [mems, ctx] = await Promise.allSettled([
        getMemories(id),
        listSharedContext(id),
      ]);
      if (mems.status === 'fulfilled') setMemories(mems.value);
      if (ctx.status === 'fulfilled') setShared(ctx.value);
      setAgentStatus(null);
    } catch (e) {
      setAgentStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(() => setAgentStatus(null), 4000);
    } finally {
      setAgentWorking(false);
    }
  }, [id]);

  // Cmd+K to toggle composer
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setComposerOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [arch, mems, ctx] = await Promise.allSettled([
          getArchives(id),
          getMemories(id),
          listSharedContext(id),
        ]);
        if (arch.status === 'fulfilled') {
          setArchives(arch.value);
          if (arch.value.l2) setSelected({ kind: 'l2' });
          else if (arch.value.l1.length > 0) setSelected({ kind: 'l1', index: 0 });
          else if (arch.value.l0.length > 0) setSelected({ kind: 'l0', index: 0 });
        } else {
          setError(arch.reason?.message ?? String(arch.reason));
        }
        if (mems.status === 'fulfilled') setMemories(mems.value);
        if (ctx.status === 'fulfilled') {
          setShared(ctx.value);
          // If no archives selected, auto-select shared context or memories
          if (
            arch.status === 'fulfilled' &&
            !arch.value.l2 &&
            arch.value.l1.length === 0 &&
            arch.value.l0.length === 0
          ) {
            if (ctx.value.length > 0) {
              setSelected({ kind: 'shared-all' });
            } else {
              setSelected({ kind: 'memories' });
            }
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function getContent(): { title: string; content: string; badge?: string } | null {
    if (!selected) return null;

    if (selected.kind === 'l2' && archives?.l2) {
      return { title: 'Epoch Summary (L2)', content: archives.l2, badge: 'L2' };
    }
    if (selected.kind === 'l1' && archives) {
      const entry = archives.l1[selected.index];
      if (entry) return { title: entry.name, content: entry.content, badge: 'L1' };
    }
    if (selected.kind === 'l0' && archives) {
      const entry = archives.l0[selected.index];
      if (entry) return { title: `Operation ${entry.id}`, content: entry.content, badge: 'L0' };
    }
    if (selected.kind === 'shared') {
      const entry = shared[selected.index];
      if (entry) return { title: entry.name, content: entry.content, badge: '◆' };
    }
    return null;
  }

  const content = getContent();

  function navItem(
    label: string,
    item: SelectedItem,
    badge?: string,
    indent = 0
  ) {
    const isActive =
      selected &&
      selected.kind === item.kind &&
      ('index' in selected ? 'index' in item && selected.index === item.index : true);

    return (
      <button
        key={label}
        onClick={() => setSelected(item)}
        className={`w-full flex items-center gap-1.5 px-3 py-1 text-left font-mono text-xs transition-colors ${
          isActive
            ? 'bg-zinc-800 text-zinc-100'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
        }`}
        style={{ paddingLeft: `${12 + indent * 12}px` }}
      >
        {badge && (
          <span className="text-zinc-600 w-5 shrink-0">{badge}</span>
        )}
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 shrink-0 font-mono text-xs">
        <Link
          href={id === '__global__' ? '/' : `/threads/${id}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← {id === '__global__' ? 'Endless' : 'Thread'}
        </Link>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-100 font-bold">Knowledge Base</span>
        {id !== '__global__' && <span className="text-zinc-500">{id}</span>}
      </div>

      {loading && (
        <div className="p-6 text-zinc-600 font-mono text-xs">Loading…</div>
      )}
      {error && (
        <div className="p-6 text-red-400 font-mono text-xs">Error: {error}</div>
      )}

      {!loading && archives && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <div className="w-48 shrink-0 border-r border-zinc-800 overflow-y-auto py-2">
            {archives.l2 && (
              <>
                <div className="px-3 py-1 text-zinc-600 font-mono text-xs font-bold uppercase tracking-wider">
                  Epoch
                </div>
                {navItem('Summary', { kind: 'l2' }, 'L2')}
              </>
            )}

            {archives.l1.length > 0 && (
              <>
                <div className="px-3 py-1 mt-2 text-zinc-600 font-mono text-xs font-bold uppercase tracking-wider">
                  Sessions
                </div>
                {archives.l1.map((e, i) =>
                  navItem(e.name, { kind: 'l1', index: i }, 'L1')
                )}
              </>
            )}

            {archives.l0.length > 0 && (
              <>
                <div className="px-3 py-1 mt-2 text-zinc-600 font-mono text-xs font-bold uppercase tracking-wider">
                  Operations
                </div>
                {archives.l0.map((e, i) =>
                  navItem(`Op ${e.id}`, { kind: 'l0', index: i }, 'L0')
                )}
              </>
            )}

            {shared.length > 0 && (
              <>
                <div className="px-3 py-1 mt-2 text-zinc-600 font-mono text-xs font-bold uppercase tracking-wider">
                  Shared Context
                </div>
                {navItem('All shared', { kind: 'shared-all' }, '◆')}
              </>
            )}

            {memories.length > 0 && (
              <>
                <div className="px-3 py-1 mt-2 text-zinc-600 font-mono text-xs font-bold uppercase tracking-wider">
                  Memories
                </div>
                {navItem('All memories', { kind: 'memories' }, '◈')}
              </>
            )}
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-hidden">
            {selected?.kind === 'shared-all' ? (
              <div className="h-full overflow-y-auto">
                <div className="px-4 py-2 border-b border-zinc-800">
                  <span className="font-mono text-sm text-zinc-100">Shared Context</span>
                </div>
                <SharedContextEditor
                  threadId={id}
                  entries={shared}
                  onUpdate={(name, content) =>
                    setShared((prev) =>
                      prev.map((e) => (e.name === name ? { ...e, content } : e))
                    )
                  }
                  onDelete={(name) =>
                    setShared((prev) => prev.filter((e) => e.name !== name))
                  }
                />
              </div>
            ) : selected?.kind === 'memories' ? (
              <div className="h-full overflow-y-auto">
                <div className="px-4 py-2 border-b border-zinc-800">
                  <span className="font-mono text-sm text-zinc-100">Memories</span>
                </div>
                <MemoryEditor
                  threadId={id}
                  memories={memories}
                  onUpdate={(name, content) =>
                    setMemories((prev) =>
                      prev.map((m) => (m.name === name ? { ...m, content } : m))
                    )
                  }
                />
              </div>
            ) : content ? (
              <ArchiveEntry
                title={content.title}
                content={content.content}
                badge={content.badge}
              />
            ) : (
              <div className="p-6 text-zinc-600 font-mono text-xs">
                Select an item from the left panel.
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !archives && !error && (
        <div className="p-6 text-zinc-600 font-mono text-xs">
          No knowledge base yet. Start a conversation to build one.
        </div>
      )}

      {/* Agent status */}
      {agentStatus && (
        <div className="shrink-0 px-4 py-1.5 border-t border-zinc-800 text-[11px] font-mono text-amber-400 animate-pulse">
          {agentStatus}
        </div>
      )}

      {/* Composer hint + overlay */}
      {!composerOpen && (
        <div className="shrink-0 flex justify-center py-2 border-t border-zinc-800">
          <button
            onClick={() => setComposerOpen(true)}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors px-3 py-1 rounded-md hover:bg-zinc-800"
          >
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-mono text-[10px] mr-1">&#8984;K</kbd>
            ask agent to modify knowledge
          </button>
        </div>
      )}
      {composerOpen && (
        <Composer
          onSend={sendToAgent}
          disabled={agentWorking}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </div>
  );
}
