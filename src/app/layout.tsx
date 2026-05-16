import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

export const metadata: Metadata = {
  title: 'FiveVote — advisory civic engagement',
  description:
    'Track official bills and propose community ideas. FiveVote is an advisory civic platform, not a legal voting system.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              FiveVote
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/bills" className="hover:underline">Official bills</Link>
              <Link href="/proposals" className="hover:underline">Community proposals</Link>
              {user ? (
                <>
                  <Link
                    href="/proposals/new"
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-700"
                  >
                    New proposal
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/auth"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
            Advisory civic signaling only. FiveVote tallies do not enact law.
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-neutral-500">
          Official legislative data is pulled from government sources with provenance preserved.
          Community proposals are clearly labeled and are not official legislation.
        </footer>
      </body>
    </html>
  );
}
