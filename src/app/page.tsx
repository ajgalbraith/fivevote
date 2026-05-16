import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await getSupabaseServerClient();

  const [{ count: billCount }, { count: proposalCount }] = await Promise.all([
    supabase.from('bills').select('*', { count: 'exact', head: true }),
    supabase
      .from('user_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('moderation_state', 'approved'),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Track legislation. Surface community ideas.
        </h1>
        <p className="max-w-2xl text-neutral-600">
          FiveVote tracks official bills from U.S. Congress and Canada&apos;s Parliament,
          and lets the public propose ideas of their own. Voting here is{' '}
          <strong>advisory civic signaling</strong> &mdash; it does not enact law.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Link
          href="/bills"
          className="group rounded-lg border border-blue-200 bg-blue-50 p-6 transition hover:border-blue-400"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
              Official
            </span>
            <h2 className="text-lg font-semibold">Government bills</h2>
          </div>
          <p className="text-sm text-neutral-700">
            Bills pulled directly from Congress.gov with full source provenance.
          </p>
          <p className="mt-3 text-2xl font-semibold">{billCount ?? 0}</p>
          <p className="text-xs text-neutral-500">tracked bills</p>
        </Link>

        <Link
          href="/proposals"
          className="group rounded-lg border border-violet-200 bg-violet-50 p-6 transition hover:border-violet-400"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-violet-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
              Community
            </span>
            <h2 className="text-lg font-semibold">Citizen proposals</h2>
          </div>
          <p className="text-sm text-neutral-700">
            Ideas authored by FiveVote users. Clearly labeled, separately governed.
          </p>
          <p className="mt-3 text-2xl font-semibold">{proposalCount ?? 0}</p>
          <p className="text-xs text-neutral-500">published proposals</p>
        </Link>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-6 text-sm text-neutral-700">
        <h3 className="mb-2 text-base font-semibold">Why FiveVote separates these</h3>
        <p>
          Lawmaking happens through legislatures and ballot processes &mdash; not through
          private apps. We never present a community tally as &ldquo;passing&rdquo; or
          &ldquo;defeating&rdquo; a law. Government bills are kept distinct from
          user-authored proposals in storage, in moderation, and in this UI.
        </p>
      </section>
    </div>
  );
}
