'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listThreads, createThread } from '@/lib/api';
import { shortModel, timeAgo, formatTokens } from '@/lib/format';
import type { ThreadInfo } from '@/lib/types';

export default function ThreadsPage() {
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listThreads();
      setThreads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const t = await createThread();
      setThreads((prev) => [t, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <h1 className="font-mono text-sm font-bold text-zinc-100">Threads</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            refresh
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono text-xs rounded transition-colors disabled:opacity-50"
          >
            {creating ? 'creating…' : '+ New Thread'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-6 text-zinc-500 font-mono text-xs">Loading…</div>
        )}
        {error && (
          <div className="p-6 text-red-400 font-mono text-xs">
            Error: {error}
            <button onClick={load} className="ml-3 underline">retry</button>
          </div>
        )}
        {!loading && !error && threads.length === 0 && (
          <div className="p-6 text-zinc-600 font-mono text-xs">
            No threads yet. Create one to get started.
          </div>
        )}
        {threads.length > 0 && (
          <table className="w-full font-mono text-xs">
            <thead className="border-b border-zinc-800">
              <tr className="text-zinc-500">
                <th className="text-left px-6 py-2 font-normal">id</th>
                <th className="text-left px-4 py-2 font-normal">model</th>
                <th className="text-right px-4 py-2 font-normal">input</th>
                <th className="text-right px-4 py-2 font-normal">output</th>
                <th className="text-right px-4 py-2 font-normal">ops</th>
                <th className="text-right px-4 py-2 font-normal">active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {threads.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-2">
                    <Link
                      href={`/threads/${t.id}`}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {t.id}
                    </Link>
                    <div className="text-zinc-600 text-xs truncate max-w-xs mt-0.5">
                      {t.working_dir}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-zinc-300">
                    {shortModel(t.model)}
                    <span className="text-zinc-600 ml-1">{t.provider}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400">
                    {formatTokens(t.total_input_tokens)}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400">
                    {formatTokens(t.total_output_tokens)}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400">
                    {t.total_operations}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-500">
                    {timeAgo(t.last_active)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
