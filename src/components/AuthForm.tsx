'use client';

import { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-4"
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
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <Button type="submit" disabled={status === 'sending'} className="w-full">
        <Mail />
        {status === 'sending' ? 'Sending…' : 'Send magic link'}
      </Button>

      {status === 'sent' ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>
            We sent a sign-in link to {email}.
          </AlertDescription>
        </Alert>
      ) : null}
      {status === 'error' ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t send link</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
