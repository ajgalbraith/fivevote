import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Landmark,
  AlertTriangle,
  Circle,
  User,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import BillSignalButtons from '@/components/BillSignalButtons';
import FollowButton from '@/components/FollowButton';

export const dynamic = 'force-dynamic';

// UTC midnight means "no time recorded" → render as date only. Supabase serializes
// timestamptz as either "...T00:00:00+00:00" or "...T00:00:00.000Z".
function formatWhen(iso: string): string {
  const isDateOnly = /T00:00:00(\.000)?(Z|\+00:?00)$/.test(iso);
  const d = new Date(iso);
  return isDateOnly ? d.toLocaleDateString(undefined, { timeZone: 'UTC' }) : d.toLocaleString();
}

type PersonRow = { id: string; name: string; party: string | null; state_or_province: string | null };

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: bill } = await supabase
    .from('bills')
    .select(
      'id, bill_number, chamber, session_label, title_en, summary_en, plain_english_summary, summary_model, status_code, introduced_at, latest_action_at, latest_action_text, source_url, source_system, jurisdictions(name, country_code, level), bill_issue_tags(issue_tags(slug, display_en)), sponsorships(role, persons(id, name, party, state_or_province))',
    )
    .eq('id', id)
    .maybeSingle();

  if (!bill) notFound();

  const [{ data: actions }, { data: counts }, { data: { user } }] = await Promise.all([
    supabase
      .from('bill_actions')
      .select('id, occurred_at, chamber, action_text')
      .eq('bill_id', id)
      .order('occurred_at', { ascending: false })
      .limit(50),
    supabase
      .from('bill_signal_counts')
      .select('support_count, oppose_count, priority_count')
      .eq('bill_id', id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const userSignals = user
    ? (
        await supabase
          .from('bill_signals')
          .select('signal')
          .eq('bill_id', id)
          .eq('user_id', user.id)
      ).data?.map((r) => r.signal as 'support' | 'oppose' | 'priority') ?? []
    : [];

  const isFollowing = user
    ? !!(await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_kind', 'bill')
        .eq('target_id', id)
        .maybeSingle()).data
    : false;

  const jurisdiction = Array.isArray(bill.jurisdictions)
    ? bill.jurisdictions[0]
    : (bill.jurisdictions as { name: string; country_code: string; level: string } | null);

  const tags = (bill.bill_issue_tags as { issue_tags: { slug: string; display_en: string } | { slug: string; display_en: string }[] | null }[] | null)
    ?.map((t) => (Array.isArray(t.issue_tags) ? t.issue_tags[0] : t.issue_tags))
    .filter((t): t is { slug: string; display_en: string } => !!t) ?? [];

  const sponsorshipRows = (bill.sponsorships as { role: string; persons: PersonRow | PersonRow[] | null }[] | null) ?? [];
  const sponsors = sponsorshipRows
    .filter((s) => s.role === 'sponsor')
    .map((s) => (Array.isArray(s.persons) ? s.persons[0] : s.persons))
    .filter((p): p is PersonRow => !!p);
  const primarySponsor = sponsors[0] ?? null;

  return (
    <div className="space-y-8">
      <Link
        href="/bills"
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2' })}
      >
        <ArrowLeft />
        All bills
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="default" className="gap-1">
            <Landmark className="size-3" /> Official
          </Badge>
          {jurisdiction ? (
            <Badge variant="outline" className="font-normal">
              {jurisdiction.country_code} · {jurisdiction.level} · {jurisdiction.name}
            </Badge>
          ) : null}
          <span className="font-mono font-medium text-foreground">{bill.bill_number}</span>
          {bill.chamber ? <span>· {bill.chamber}</span> : null}
          <span>· {bill.session_label}</span>
          {bill.status_code ? (
            <Badge variant="secondary" className="ml-auto font-normal">
              {bill.status_code}
            </Badge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          {bill.title_en ?? '(untitled)'}
        </h1>
        {primarySponsor ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="size-4" />
            <span>Sponsored by</span>
            <Link
              href={`/people/${primarySponsor.id}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {primarySponsor.name}
            </Link>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <Link
              key={t.slug}
              href={`/bills?issue=${t.slug}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t.display_en}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <FollowButton
              targetKind="bill"
              targetId={bill.id}
              isSignedIn={!!user}
              initialFollowing={isFollowing}
              revalidate={`/bills/${bill.id}`}
            />
            {bill.source_url ? (
              <a
                href={bill.source_url}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                View source on {bill.source_system}
                <ExternalLink />
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {bill.plain_english_summary ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono uppercase tracking-wide">
              AI summary
            </span>
            {bill.summary_model ? <span>· {bill.summary_model}</span> : null}
          </div>
          <p className="text-base leading-relaxed">{bill.plain_english_summary}</p>
        </section>
      ) : null}

      <Alert>
        <AlertTriangle />
        <AlertTitle>Advisory signal only</AlertTitle>
        <AlertDescription>
          Your input is community feedback, not a legislative vote. Lawmaking happens
          through Congress, not through FiveVote.
        </AlertDescription>
      </Alert>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Community signal</h2>
        <BillSignalButtons
          billId={bill.id}
          isSignedIn={!!user}
          counts={counts ?? { support_count: 0, oppose_count: 0, priority_count: 0 }}
          userSignals={userSignals}
        />
      </section>

      {bill.summary_en ? (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-base font-semibold">Official summary</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {bill.summary_en}
            </p>
          </section>
        </>
      ) : null}

      <Separator />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Status timeline</h2>
          {bill.introduced_at ? (
            <span className="text-xs text-muted-foreground">
              Introduced {new Date(bill.introduced_at).toLocaleDateString()}
            </span>
          ) : null}
        </div>
        {actions && actions.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <ol className="relative">
                {actions.map((a, idx) => (
                  <li
                    key={a.id}
                    className="relative flex gap-3 border-b border-border px-4 py-3 last:border-0"
                  >
                    <div className="relative flex flex-col items-center pt-1">
                      <Circle
                        className={`size-2.5 ${idx === 0 ? 'fill-foreground text-foreground' : 'fill-muted-foreground/50 text-muted-foreground/50'}`}
                      />
                      {idx < actions.length - 1 ? (
                        <span
                          aria-hidden
                          className="mt-1 w-px flex-1 bg-border"
                          style={{ minHeight: 18 }}
                        />
                      ) : null}
                    </div>
                    <div className="space-y-0.5 pb-1 text-sm">
                      <div className="text-xs text-muted-foreground">
                        {formatWhen(a.occurred_at)}
                        {a.chamber ? ` · ${a.chamber}` : ''}
                      </div>
                      <div className="leading-snug">{a.action_text}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No actions recorded yet.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
