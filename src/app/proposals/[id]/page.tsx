import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import ProposalSignalButtons from '@/components/ProposalSignalButtons';
import FollowButton from '@/components/FollowButton';

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

  const isFollowing = user
    ? !!(await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_kind', 'proposal')
        .eq('target_id', id)
        .maybeSingle()).data
    : false;

  const jName = Array.isArray(proposal.jurisdictions)
    ? proposal.jurisdictions[0]?.name
    : (proposal.jurisdictions as { name?: string } | null)?.name;

  const isPending = proposal.moderation_state === 'pending';

  return (
    <div className="space-y-8">
      <Link
        href="/proposals"
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2' })}
      >
        <ArrowLeft />
        All proposals
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <Users className="size-3" /> Community
          </Badge>
          {jName ? <span className="text-muted-foreground">{jName}</span> : null}
          {isPending ? (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
              pending moderator review
            </Badge>
          ) : null}
          <div className="ml-auto">
            <FollowButton
              targetKind="proposal"
              targetId={proposal.id}
              isSignedIn={!!user}
              initialFollowing={isFollowing}
              revalidate={`/proposals/${proposal.id}`}
            />
          </div>
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          {proposal.title}
        </h1>
      </header>

      <Alert>
        <AlertTriangle />
        <AlertTitle>Community proposal — not legislation</AlertTitle>
        <AlertDescription>
          This is an idea authored by a FiveVote user. Lawmaking happens through
          Congress, not through FiveVote.
        </AlertDescription>
      </Alert>

      {proposal.plain_language_summary ? (
        <Card>
          <CardContent className="space-y-1 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Summary
            </div>
            <p className="text-base">{proposal.plain_language_summary}</p>
          </CardContent>
        </Card>
      ) : null}

      {proposal.problem_statement ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Problem
          </h2>
          <p className="whitespace-pre-line text-sm text-foreground/90">
            {proposal.problem_statement}
          </p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Proposal
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {proposal.proposal_text}
        </p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Community signal</h2>
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
