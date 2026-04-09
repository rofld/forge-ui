'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthToken } from '@/lib/api';
import ShardIcon from '@/components/ui/ShardIcon';

export default function LoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Token required');
      return;
    }

    // Test the token against the health-adjacent threads endpoint
    try {
      const API_BASE = process.env.NEXT_PUBLIC_FORGE_API || 'http://localhost:3142';
      const res = await fetch(`${API_BASE}/threads`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      if (res.status === 401) {
        setError('Invalid token');
        return;
      }
      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        return;
      }
    } catch {
      setError('Cannot reach server');
      return;
    }

    setAuthToken(token.trim());
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 px-6">
        <div className="flex items-center justify-center gap-3 mb-8">
          <ShardIcon size={28} className="text-amber-500" />
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            claw
          </h1>
        </div>

        <div>
          <label htmlFor="token" className="block text-sm text-stone-400 mb-2">
            API Token
          </label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your access token"
            autoFocus
            className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder-stone-600 outline-none focus:border-amber-500/40 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-amber-500/20 text-amber-300 font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/20"
        >
          Connect
        </button>

        <p className="text-center text-stone-600 text-xs">
          Token is stored locally and sent as Bearer auth
        </p>
      </form>
    </div>
  );
}
