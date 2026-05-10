// dispatch-form.tsx — Form component for dispatching an agent to a GitHub issue.
// Calls POST /issues/{number}/dispatch with model, persona, acceptance command,
// max iterations, and worktree dir. Uses raw fetch since apiFetch is not exported.
'use client';

import { useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_FORGE_API || 'http://localhost:3142';

const MODEL_OPTIONS = [
  'sonnet',
  'opus',
  'haiku',
  'deepseek-pro',
  'deepseek-flash',
  'glm-flash-or',
] as const;

interface DispatchFormProps {
  /** GitHub issue number. Used for the default worktree path and the POST endpoint. */
  issue: number;
  /** Called after a successful dispatch so parents can react (e.g. close a drawer). */
  onSuccess?: () => void;
}

interface DispatchPayload {
  model: string;
  persona?: string;
  acceptance?: string;
  max_iterations: number;
  worktree_dir: string;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('forge_token');
}

async function postDispatch(issueNumber: number, payload: DispatchPayload): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/issues/${issueNumber}/dispatch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    localStorage.removeItem('forge_token');
    window.location.href = '/login';
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${body}`);
  }
}

export default function DispatchForm({ issue, onSuccess }: DispatchFormProps) {
  const [model, setModel] = useState<string>('sonnet');
  const [persona, setPersona] = useState('');
  const [acceptance, setAcceptance] = useState('');
  const [maxIterations, setMaxIterations] = useState(1);
  const [worktreeDir, setWorktreeDir] = useState(
    `/home/ubuntu/forge-wt/dispatch-${issue}`,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid =
    maxIterations >= 1 &&
    maxIterations <= 5 &&
    worktreeDir.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const payload: DispatchPayload = {
      model,
      max_iterations: maxIterations,
      worktree_dir: worktreeDir.trim(),
    };
    if (persona.trim()) payload.persona = persona.trim();
    if (acceptance.trim()) payload.acceptance = acceptance.trim();

    try {
      await postDispatch(issue, payload);
      setSuccess(true);
      console.log(`[dispatch] issue #${issue} dispatched with model=${model}`);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 font-mono text-sm"
    >
      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
        Dispatch agent → issue #{issue}
      </div>

      {/* Model */}
      <div className="space-y-1">
        <label className="block text-xs text-zinc-400">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-amber-500/60"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Persona */}
      <div className="space-y-1">
        <label className="block text-xs text-zinc-400">
          Persona <span className="text-zinc-600">(optional)</span>
        </label>
        <input
          type="text"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder="e.g. reviewer, tester"
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500/60"
        />
      </div>

      {/* Acceptance command */}
      <div className="space-y-1">
        <label className="block text-xs text-zinc-400">
          Acceptance command <span className="text-zinc-600">(optional)</span>
        </label>
        <input
          type="text"
          value={acceptance}
          onChange={(e) => setAcceptance(e.target.value)}
          placeholder='e.g. cargo nextest run -E "test(/feature_x)"'
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500/60"
        />
      </div>

      {/* Max iterations */}
      <div className="space-y-1">
        <label className="block text-xs text-zinc-400">
          Max iterations <span className="text-zinc-600">(1–5)</span>
        </label>
        <input
          type="number"
          value={maxIterations}
          min={1}
          max={5}
          onChange={(e) => setMaxIterations(Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-amber-500/60"
        />
        {(maxIterations < 1 || maxIterations > 5) && (
          <p className="text-xs text-red-400">Must be between 1 and 5.</p>
        )}
      </div>

      {/* Worktree dir */}
      <div className="space-y-1">
        <label className="block text-xs text-zinc-400">Worktree dir</label>
        <input
          type="text"
          value={worktreeDir}
          onChange={(e) => setWorktreeDir(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-amber-500/60"
        />
        {worktreeDir.trim().length === 0 && (
          <p className="text-xs text-red-400">Worktree dir is required.</p>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800/40 rounded px-3 py-2">
          Dispatched successfully.
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || submitting}
        className="w-full py-2 px-4 rounded bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
      >
        {submitting ? 'Dispatching…' : 'Dispatch'}
      </button>
    </form>
  );
}
