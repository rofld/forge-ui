'use client';

import { useState, useRef, useEffect } from 'react';
import { updateSharedContext, deleteSharedContext } from '@/lib/api';

interface SharedEntry {
  name: string;
  content: string;
}

interface SharedContextEditorProps {
  threadId: string;
  entries: SharedEntry[];
  onUpdate?: (name: string, content: string) => void;
  onDelete?: (name: string) => void;
}

function AutoTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = Math.max(120, Math.min(ref.current.scrollHeight, 500)) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-zinc-200 resize-none overflow-y-auto focus:outline-none focus:border-zinc-500"
      style={{ minHeight: 120, maxHeight: 500 }}
    />
  );
}

export default function SharedContextEditor({
  threadId,
  entries,
  onUpdate,
  onDelete,
}: SharedContextEditorProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(entry: SharedEntry) {
    setEditing(entry.name);
    setDraft(entry.content);
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
      await updateSharedContext(threadId, editing, draft);
      onUpdate?.(editing, draft);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete shared context "${name}"?`)) return;
    try {
      await deleteSharedContext(threadId, name);
      onDelete?.(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (entries.length === 0) {
    return (
      <div className="p-4 text-zinc-600 font-mono text-xs">
        No shared context yet. Use ShareContext tool or upload files.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800">
      {entries.map((entry) => (
        <div key={entry.name} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-zinc-400 font-bold">{entry.name}</span>
            {editing === entry.name ? (
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
                  {saving ? 'saving...' : 'save'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(entry)}
                  className="text-xs font-mono text-zinc-600 hover:text-zinc-400"
                >
                  edit
                </button>
                <button
                  onClick={() => handleDelete(entry.name)}
                  className="text-xs font-mono text-zinc-600 hover:text-red-400"
                >
                  delete
                </button>
              </div>
            )}
          </div>

          {editing === entry.name ? (
            <AutoTextarea value={draft} onChange={setDraft} />
          ) : (
            <p className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">{entry.content}</p>
          )}

          {editing === entry.name && error && (
            <p className="mt-1 text-xs text-red-400 font-mono">{error}</p>
          )}
        </div>
      ))}
    </div>
  );
}
