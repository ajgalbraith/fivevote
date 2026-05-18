import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { Landmark, Users, PlusCircle, Bell } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import './globals.css';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'FiveVote — advisory civic engagement',
  description:
    'Track official bills and propose community ideas. FiveVote is an advisory civic platform, not a legal voting system.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={cn('h-full antialiased', geistSans.variable, geistMono.variable)}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                5V
              </span>
              FiveVote
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/bills" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <Landmark />
                Official bills
              </Link>
              <Link href="/proposals" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <Users />
                Proposals
              </Link>
              {user ? (
                <>
                  <Link href="/following" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                    <Bell />
                    Following
                  </Link>
                  <Link href="/proposals/new" className={buttonVariants({ size: 'sm' })}>
                    <PlusCircle />
                    New proposal
                  </Link>
                  <Link
                    href="/profile"
                    aria-label="Profile"
                    className="ml-1 inline-flex items-center"
                  >
                    <Avatar className="size-8 transition hover:ring-2 hover:ring-ring/40">
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                        {(user.email ?? 'U')
                          .split(/[@._]/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? '')
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </>
              ) : (
                <Link href="/auth" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Sign in
                </Link>
              )}
            </nav>
          </div>
          <div className="border-t border-amber-200/70 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
            Advisory civic signaling only. FiveVote tallies do not enact law.
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>

        <footer className="mx-auto mt-16 max-w-6xl px-4 pb-10 text-xs text-muted-foreground">
          <Alert>
            <AlertDescription>
              Official legislative data is pulled directly from government sources with
              provenance preserved. Community proposals are clearly labeled and are not
              official legislation.
            </AlertDescription>
          </Alert>
        </footer>
      </body>
    </html>
  );
}
