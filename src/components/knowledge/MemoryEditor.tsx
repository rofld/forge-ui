'use client';

import { useState } from 'react';
import { updateMemory } from '@/lib/api';
import type { Memory } from '@/lib/types';

interface MemoryEditorProps {
  threadId: string;
  memories: Memory[];
  onUpdate?: (name: string, content: string) => void;
}

export default function MemoryEditor({ threadId, memories, onUpdate }: MemoryEditorProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(m: Memory) {
    setEditing(m.name);
    setDraft(m.content);
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft('');
    setError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await updateMemory(threadId, editing, draft);
      onUpdate?.(editing, draft);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (memories.length === 0) {
    return (
      <div className="p-4 text-zinc-600 font-mono text-xs">
        No memories yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800">
      {memories.map((m) => (
        <div key={m.name} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-zinc-400 font-bold">{m.name}</span>
            {editing === m.name ? (
              <div className="flex gap-2">
                <button
                  onClick={cancelEdit}
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-300"
                >
                  cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="text-xs font-mono text-emerald-500 hover:text-emerald-300 disabled:opacity-50"
                >
                  {saving ? 'saving…' : 'save'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => startEdit(m)}
                className="text-xs font-mono text-zinc-600 hover:text-zinc-400"
              >
                edit
              </button>
            )}
          </div>

          {editing === m.name ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono text-zinc-200 resize-y focus:outline-none focus:border-zinc-500"
            />
          ) : (
            <p className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">{m.content}</p>
          )}

          {editing === m.name && error && (
            <p className="mt-1 text-xs text-red-400 font-mono">{error}</p>
          )}
        </div>
      ))}
    </div>
  );
}
