import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import ProposalSignalButtons from '@/components/ProposalSignalButtons';

export const dynamic = 'force-dynamic';

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: proposal } = await supabase
    .from('user_proposals')
    .select(
      'id, title, plain_language_summary, problem_statement, proposal_text, status, moderation_state, published_at, author_user_id, jurisdictions(name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!proposal) notFound();

  const [{ data: counts }, { data: { user } }] = await Promise.all([
    supabase
      .from('proposal_signal_counts')
      .select('support_count, not_now_count, needs_revision_count')
      .eq('proposal_id', id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const userSignal = user
    ? (
        await supabase
          .from('proposal_signals')
          .select('signal')
          .eq('proposal_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
      ).data?.signal as 'support' | 'not_now' | 'needs_revision' | undefined
    : undefined;

  const jName = Array.isArray(proposal.jurisdictions)
    ? proposal.jurisdictions[0]?.name
    : (proposal.jurisdictions as { name?: string } | null)?.name;

  const isPending = proposal.moderation_state === 'pending';

  return (
    <div className="space-y-8">
      <nav className="text-sm">
        <Link href="/proposals" className="text-violet-600 hover:underline">
          ← All proposals
        </Link>
      </nav>

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-violet-600 px-2 py-0.5 font-semibold uppercase tracking-wide text-white">
            Community
          </span>
          {jName ? <span className="text-neutral-600">{jName}</span> : null}
          {isPending ? (
            <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800">
              pending moderator review
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold leading-tight">{proposal.title}</h1>
      </header>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Community proposal &mdash; not legislation.</strong> This is an idea
        authored by a FiveVote user. Lawmaking happens through Congress and Parliament,
        not through FiveVote.
      </section>

      {proposal.plain_language_summary ? (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Summary
          </h2>
          <p className="text-base">{proposal.plain_language_summary}</p>
        </section>
      ) : null}

      {proposal.problem_statement ? (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Problem
          </h2>
          <p className="whitespace-pre-line text-sm text-neutral-800">
            {proposal.problem_statement}
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Proposal
        </h2>
        <p className="whitespace-pre-line text-sm text-neutral-800">
          {proposal.proposal_text}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Community signal</h2>
        <ProposalSignalButtons
          proposalId={proposal.id}
          isSignedIn={!!user}
          counts={
            counts ?? { support_count: 0, not_now_count: 0, needs_revision_count: 0 }
          }
          userSignal={userSignal}
        />
      </section>
    </div>
  );
}
