'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus('sending');
        setError('');
        const supabase = getSupabaseBrowserClient();
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) {
          setStatus('error');
          setError(error.message);
        } else {
          setStatus('sent');
        }
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="you@example.com"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending...' : 'Send magic link'}
      </button>
      {status === 'sent' ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Check your inbox for a sign-in link.
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </form>
  );
}
