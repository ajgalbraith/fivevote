'use client';

import { useState, type FormEvent as ReactFormEvent } from 'react';
import { Mail, CheckCircle2, KeyRound } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const sendMagicLink = async (e: ReactFormEvent) => {
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
  };

  const signInWithPassword = async (e: ReactFormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('error');
      setError(error.message);
      return;
    }
    // Force a full reload so the server layout re-renders with the session cookie.
    window.location.assign(next || '/');
  };

  return (
    <Tabs defaultValue="password" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="magic">Magic link</TabsTrigger>
      </TabsList>

      <TabsContent value="password" className="space-y-4">
        <form className="space-y-3" onSubmit={signInWithPassword}>
          <div className="space-y-2">
            <Label htmlFor="email-pw">Email</Label>
            <Input
              id="email-pw"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={status === 'sending'} className="w-full">
            <KeyRound />
            {status === 'sending' ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="magic" className="space-y-4">
        <form className="space-y-3" onSubmit={sendMagicLink}>
          <div className="space-y-2">
            <Label htmlFor="email-magic">Email</Label>
            <Input
              id="email-magic"
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
              <AlertDescription>We sent a sign-in link to {email}.</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </TabsContent>

      {status === 'error' ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t sign in</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </Tabs>
  );
}
