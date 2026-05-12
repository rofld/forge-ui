'use client';

import { useState, useRef, useEffect } from 'react';
import { patchThreadEgress } from '@/lib/api';
import type { EgressPolicy } from '@/lib/types';

interface ThreadSettingsProps {
  threadId: string;
  currentEgress?: EgressPolicy;
  onEgressUpdate?: (egress: EgressPolicy) => void;
  disabled?: boolean;
}

const DEFAULT_ALLOWLIST_HOSTS = [
  'pypi.org',
  'npm.org',
  'crates.io',
  'github.com',
  'huggingface.co',
];

export default function ThreadSettings({
  threadId,
  currentEgress = { kind: 'allowlist', hosts: DEFAULT_ALLOWLIST_HOSTS },
  onEgressUpdate,
  disabled = false,
}: ThreadSettingsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEgressChange = async (newEgress: EgressPolicy) => {
    setLoading(true);
    try {
      const result = await patchThreadEgress(threadId, newEgress);
      showToast('Sandbox restarting…');
      if (onEgressUpdate) {
        onEgressUpdate(newEgress);
      }
      setOpen(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update policy';
      showToast(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const getEgressLabel = () => {
    if (currentEgress.kind === 'off') return 'No Network';
    if (currentEgress.kind === 'open') return 'Open (Unrestricted)';
    return 'Allowlist (Default)';
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          disabled={disabled || loading}
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all bg-gradient-to-br from-slate-500/20 to-slate-600/10 text-slate-500 border border-slate-500/20 shadow-lg shadow-slate-500/5 hover:from-slate-500/30 hover:to-slate-600/20 cursor-pointer disabled:opacity-40"
          title="Network policy"
        >
          🌐
        </button>

        {open && (
          <div className="absolute right-0 top-10 z-50 w-72 bg-background border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in-up">
            <div className="px-4 py-3 text-xs text-stone-500 uppercase tracking-widest font-medium border-b border-border">
              Network Policy
            </div>

            <div className="p-4 space-y-3">
              {/* Allowlist option */}
              <button
                onClick={() => handleEgressChange({ kind: 'allowlist', hosts: DEFAULT_ALLOWLIST_HOSTS })}
                disabled={loading}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  currentEgress.kind === 'allowlist'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-border bg-white/[0.02] hover:bg-white/[0.06]'
                } disabled:opacity-40`}
              >
                <div className="text-xs font-semibold text-foreground">Allowlist (Default)</div>
                <div className="text-xs text-foreground/60 mt-1">
                  Restricted to: PyPI, npm, Crates, GitHub, HuggingFace
                </div>
              </button>

              {/* Open option */}
              <button
                onClick={() => handleEgressChange({ kind: 'open' })}
                disabled={loading}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  currentEgress.kind === 'open'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-border bg-white/[0.02] hover:bg-white/[0.06]'
                } disabled:opacity-40`}
              >
                <div className="text-xs font-semibold text-red-400 flex items-center gap-1">
                  ⚠️ Open (Unrestricted)
                </div>
                <div className="text-xs text-foreground/60 mt-1">
                  Can reach entire internet. Use only for trusted operations.
                </div>
              </button>

              {/* Off option */}
              <button
                onClick={() => handleEgressChange({ kind: 'off' })}
                disabled={loading}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  currentEgress.kind === 'off'
                    ? 'border-slate-500 bg-slate-500/10'
                    : 'border-border bg-white/[0.02] hover:bg-white/[0.06]'
                } disabled:opacity-40`}
              >
                <div className="text-xs font-semibold text-foreground">Off (No Network)</div>
                <div className="text-xs text-foreground/60 mt-1">
                  Sandbox has no outbound network. Localhost still works.
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 z-[100] px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs animate-fade-in-up">
          {toastMessage}
        </div>
      )}
    </>
  );
}
