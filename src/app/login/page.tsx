// login/page.tsx — /login route: username + password sign-in form.
// On success: sets token via AuthContext.signIn, then redirects to /.
// On failure: shows a toast error message.
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/components/ui/toaster';
import ShardIcon from '@/components/ui/ShardIcon';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      toast.error('Username and password are required');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(username.trim(), password);
      router.push('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 px-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <ShardIcon size={28} className="text-amber-500" />
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Sign in
          </h1>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm text-stone-400 mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-username"
            autoComplete="username"
            autoFocus
            disabled={submitting}
            className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder-stone-600 outline-none focus:border-amber-500/40 transition-colors disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm text-stone-400 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={submitting}
            className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder-stone-600 outline-none focus:border-amber-500/40 transition-colors disabled:opacity-50"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-amber-500/20 text-amber-300 font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        {/* Footer */}
        <p className="text-center text-stone-600 text-xs pt-2">
          Forge — internal access only
        </p>
      </form>
    </div>
  );
}
