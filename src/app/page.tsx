import Link from 'next/link';
import {
  Landmark,
  Users,
  ArrowRight,
  ScrollText,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import BillSearchBar from '@/components/BillSearchBar';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { bilTagSlugs, queryBills } from '@/lib/bills/query';

export const dynamic = 'force-dynamic';

const FEATURED_ISSUES = [
  { slug: 'health', label: 'Health' },
  { slug: 'housing', label: 'Housing' },
  { slug: 'immigration', label: 'Immigration' },
  { slug: 'environment', label: 'Environment' },
  { slug: 'taxation', label: 'Taxation' },
  { slug: 'technology', label: 'Technology' },
  { slug: 'civil-rights', label: 'Civil rights' },
  { slug: 'education', label: 'Education' },
];

export default async function Home() {
  const supabase = await getSupabaseServerClient();

  const [billCountRes, proposalCountRes, trending] = await Promise.all([
    supabase.from('bills').select('*', { count: 'exact', head: true }),
    supabase
      .from('user_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('moderation_state', 'approved'),
    queryBills(supabase, {}, 5).catch(() => ({ data: [], count: 0 })),
  ]);

  const billCount = billCountRes.count ?? 0;
  const proposalCount = proposalCountRes.count ?? 0;

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-6">
        <Badge variant="outline">Open civic data · advisory voting</Badge>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          Vote where you stand on every bill.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Track official legislation from the United States and Canada. Surface community
          proposals. FiveVote is{' '}
          <span className="font-medium text-foreground">advisory civic signaling</span>
          {' '}— it does not replace elections, referendums, or legislative votes.
        </p>
        <div className="max-w-2xl">
          <BillSearchBar size="lg" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Try:</span>
          <Link
            href="/bills?country=US&level=federal"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            US federal
          </Link>
          <Link
            href="/bills?since=week"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Active this week
          </Link>
          <Link
            href="/bills?issue=health"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Health
          </Link>
          <Link
            href="/bills?issue=housing"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Housing
          </Link>
        </div>
      </section>

      {/* Three section cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <SectionCard
          tone="official"
          icon={<Landmark className="size-4 text-muted-foreground" />}
          badge={<Badge variant="default">Official</Badge>}
          title="Government bills"
          description="Active legislation pulled directly from Congress.gov, with provenance preserved."
          metric={billCount}
          metricLabel="tracked bills"
          href="/bills"
        />
        <SectionCard
          tone="laws"
          icon={<ScrollText className="size-4 text-muted-foreground" />}
          badge={<Badge variant="outline">Coming next</Badge>}
          title="Existing laws"
          description="Consolidated statutes from Justice Laws Canada and the U.S. Code."
          metric="—"
          metricLabel="not yet ingested"
          href="/bills"
          disabled
        />
        <SectionCard
          tone="community"
          icon={<Users className="size-4 text-muted-foreground" />}
          badge={<Badge variant="secondary">Community</Badge>}
          title="Citizen proposals"
          description="Ideas authored by FiveVote users. Clearly labeled. Separately governed."
          metric={proposalCount}
          metricLabel="published proposals"
          href="/proposals"
        />
      </section>

      {/* Follow issues teaser */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Follow issues you care about</h2>
          <span className="text-xs text-muted-foreground">12 categories</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {FEATURED_ISSUES.map((i) => (
            <Link
              key={i.slug}
              href={`/bills?issue=${i.slug}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {i.label}
            </Link>
          ))}
          <Link
            href="/bills"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            All issues <ArrowRight />
          </Link>
        </div>
      </section>

      <Separator />

      {/* Trending */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Most recent activity</h2>
          </div>
          <Link
            href="/bills"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            See all <ArrowRight />
          </Link>
        </div>
        {trending.data.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No bills ingested yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {trending.data.map((b) => {
              const tags = bilTagSlugs(b).slice(0, 3);
              return (
                <Link key={b.id} href={`/bills/${b.id}`} className="block">
                  <Card className="transition hover:border-foreground/20">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="default" className="gap-1">
                          <Landmark className="size-3" /> Official
                        </Badge>
                        <span className="font-mono font-medium text-foreground">
                          {b.bill_number}
                        </span>
                        {b.chamber ? <span>· {b.chamber}</span> : null}
                        {b.latest_action_at ? (
                          <span className="ml-auto">
                            {new Date(b.latest_action_at).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                      <div className="font-medium leading-snug">
                        {b.title_en ?? '(untitled)'}
                      </div>
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <Badge key={t.slug} variant="outline" className="text-[0.7rem] font-normal">
                              {t.display_en}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      <section className="max-w-2xl space-y-2 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">
          Why FiveVote separates these
        </h2>
        <p>
          Lawmaking happens through legislatures and ballot processes — not through
          private apps. We never present a community tally as &ldquo;passing&rdquo; or
          &ldquo;defeating&rdquo; a law. Government bills are kept distinct from
          user-authored proposals in storage, in moderation, and in this UI.
        </p>
      </section>
    </div>
  );
}

function SectionCard({
  icon,
  badge,
  title,
  description,
  metric,
  metricLabel,
  href,
  disabled,
}: {
  tone: 'official' | 'community' | 'laws';
  icon: React.ReactNode;
  badge: React.ReactNode;
  title: string;
  description: string;
  metric: string | number;
  metricLabel: string;
  href: string;
  disabled?: boolean;
}) {
  const content = (
    <Card className={`h-full transition ${disabled ? 'opacity-60' : 'hover:border-foreground/20'}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          {badge}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-3xl font-semibold tabular-nums">{metric}</div>
        <div className="text-xs text-muted-foreground">{metricLabel}</div>
      </CardContent>
      <CardFooter>
        <span
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'ml-auto pointer-events-none',
          })}
        >
          Browse <ArrowRight />
        </span>
      </CardFooter>
    </Card>
  );

  if (disabled) {
    return <div>{content}</div>;
  }
  return <Link href={href}>{content}</Link>;
}
