import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, Landmark, Users, Tag } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { billSponsor, type BillListRow } from '@/lib/bills/query';

export const dynamic = 'force-dynamic';

export default async function FollowingPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/following');

  const { data: subs } = await supabase
    .from('notification_subscriptions')
    .select('target_kind, target_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const billIds = subs?.filter((s) => s.target_kind === 'bill').map((s) => s.target_id) ?? [];
  const proposalIds = subs?.filter((s) => s.target_kind === 'proposal').map((s) => s.target_id) ?? [];
  const issueIds = subs?.filter((s) => s.target_kind === 'issue').map((s) => s.target_id) ?? [];

  const [billsRes, proposalsRes, issuesRes] = await Promise.all([
    billIds.length
      ? supabase
          .from('bills')
          .select(
            'id, bill_number, chamber, session_label, title_en, plain_english_summary, status_code, latest_action_at, latest_action_text, jurisdictions(name, country_code, level), bill_issue_tags(issue_tags(slug, display_en)), sponsorships(role, persons(id, name, party, state_or_province))',
          )
          .in('id', billIds)
          .order('latest_action_at', { ascending: false, nullsFirst: false })
      : Promise.resolve({ data: [] as BillListRow[] }),
    proposalIds.length
      ? supabase
          .from('user_proposals')
          .select(
            'id, title, plain_language_summary, status, moderation_state, published_at, jurisdictions(name)',
          )
          .in('id', proposalIds)
          .order('published_at', { ascending: false, nullsFirst: false })
      : Promise.resolve({ data: [] }),
    issueIds.length
      ? supabase.from('issue_tags').select('id, slug, display_en').in('id', issueIds)
      : Promise.resolve({ data: [] }),
  ]);

  const bills = (billsRes.data ?? []) as unknown as BillListRow[];
  const proposals = (proposalsRes.data ?? []) as Array<{
    id: string;
    title: string;
    plain_language_summary: string | null;
    status: string;
    moderation_state: string;
    published_at: string | null;
    jurisdictions: { name: string } | { name: string }[] | null;
  }>;
  const issues = (issuesRes.data ?? []) as Array<{ id: string; slug: string; display_en: string }>;

  const totalFollowed = bills.length + proposals.length + issues.length;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-muted-foreground" />
          <h1 className="text-3xl font-semibold tracking-tight">Following</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalFollowed === 0
            ? "You're not following anything yet."
            : `${totalFollowed} item${totalFollowed === 1 ? '' : 's'} followed.`}
        </p>
      </header>

      {totalFollowed === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <Bell className="mx-auto size-8 text-muted-foreground/60" />
            <div className="text-sm text-muted-foreground">
              Tap the <span className="font-medium text-foreground">Follow</span> button on any bill or proposal
              to start tracking it here.
            </div>
            <Link href="/bills" className={buttonVariants({ size: 'sm' })}>
              Browse bills
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {bills.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Bills</h2>
            <span className="text-xs text-muted-foreground">{bills.length}</span>
          </div>
          <div className="grid gap-3">
            {bills.map((b) => {
              const sponsor = billSponsor(b);
              return (
                <Link key={b.id} href={`/bills/${b.id}`} className="block">
                  <Card className="transition hover:border-foreground/20">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="default" className="gap-1">
                          <Landmark className="size-3" /> Official
                        </Badge>
                        <span className="font-mono font-medium text-foreground">{b.bill_number}</span>
                        {b.chamber ? <span>· {b.chamber}</span> : null}
                        {b.latest_action_at ? (
                          <span className="ml-auto">
                            {new Date(b.latest_action_at).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                      <div className="font-medium leading-snug">{b.title_en ?? '(untitled)'}</div>
                      {b.plain_english_summary ? (
                        <div className="line-clamp-2 text-sm text-foreground/90">
                          {b.plain_english_summary}
                        </div>
                      ) : b.latest_action_text ? (
                        <div className="line-clamp-2 text-sm text-muted-foreground">
                          Latest: {b.latest_action_text}
                        </div>
                      ) : null}
                      {sponsor ? (
                        <div className="text-xs text-muted-foreground">
                          Sponsored by {sponsor.name}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {proposals.length > 0 ? (
        <>
          <Separator />
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Proposals</h2>
              <span className="text-xs text-muted-foreground">{proposals.length}</span>
            </div>
            <div className="grid gap-3">
              {proposals.map((p) => {
                const jName = Array.isArray(p.jurisdictions)
                  ? p.jurisdictions[0]?.name
                  : (p.jurisdictions as { name?: string } | null)?.name;
                return (
                  <Link key={p.id} href={`/proposals/${p.id}`} className="block">
                    <Card className="transition hover:border-foreground/20">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="gap-1">
                            <Users className="size-3" /> Community
                          </Badge>
                          {jName ? <span>{jName}</span> : null}
                          {p.moderation_state === 'pending' ? (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                              pending review
                            </Badge>
                          ) : null}
                        </div>
                        <div className="font-medium leading-snug">{p.title}</div>
                        {p.plain_language_summary ? (
                          <div className="line-clamp-2 text-sm text-muted-foreground">
                            {p.plain_language_summary}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      {issues.length > 0 ? (
        <>
          <Separator />
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Issues</h2>
              <span className="text-xs text-muted-foreground">{issues.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {issues.map((i) => (
                <Link
                  key={i.id}
                  href={`/bills?issue=${i.slug}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  {i.display_en}
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
