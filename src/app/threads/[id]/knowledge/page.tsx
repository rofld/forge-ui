'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getArchives, getMemories } from '@/lib/api';
import ArchiveEntry from '@/components/knowledge/ArchiveEntry';
import MemoryEditor from '@/components/knowledge/MemoryEditor';
import type { Archives, Memory } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

type SelectedItem =
  | { kind: 'l2' }
  | { kind: 'l1'; index: number }
  | { kind: 'l0'; index: number }
  | { kind: 'memories' };

export default function KnowledgePage({ params }: Props) {
  const { id } = use(params);

  const [archives, setArchives] = useState<Archives | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [arch, mems] = await Promise.allSettled([
          getArchives(id),
          getMemories(id),
        ]);
        if (arch.status === 'fulfilled') {
          setArchives(arch.value);
          // Auto-select first available item
          if (arch.value.l2) setSelected({ kind: 'l2' });
          else if (arch.value.l1.length > 0) setSelected({ kind: 'l1', index: 0 });
          else if (arch.value.l0.length > 0) setSelected({ kind: 'l0', index: 0 });
          else setSelected({ kind: 'memories' });
        } else {
          setError(arch.reason?.message ?? String(arch.reason));
        }
        if (mems.status === 'fulfilled') setMemories(mems.value);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function getContent(): { title: string; content: string; badge?: string } | null {
    if (!archives || !selected) return null;

    if (selected.kind === 'l2' && archives.l2) {
      return { title: 'Epoch Summary (L2)', content: archives.l2, badge: 'L2' };
    }
    if (selected.kind === 'l1') {
      const entry = archives.l1[selected.index];
      if (entry) return { title: entry.name, content: entry.content, badge: 'L1' };
    }
    if (selected.kind === 'l0') {
      const entry = archives.l0[selected.index];
      if (entry) return { title: `Operation ${entry.id}`, content: entry.content, badge: 'L0' };
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
        <Link href={`/threads/${id}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Thread
        </Link>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-100 font-bold">Knowledge Base</span>
        <span className="text-zinc-500">{id}</span>
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
            {selected?.kind === 'memories' ? (
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
    </div>
  );
}
