import Link from 'next/link';
import { Landmark, Users, ArrowRight, ScrollText } from 'lucide-react';

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
import VoteFeed from '@/components/VoteFeed';
import FeedSortPills from '@/components/FeedSortPills';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadFeed, parseSort } from '@/lib/feed';

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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = parseSort(sortRaw);

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [billCountRes, proposalCountRes, feed] = await Promise.all([
    supabase.from('bills').select('*', { count: 'exact', head: true }),
    supabase
      .from('user_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('moderation_state', 'approved'),
    loadFeed(supabase, sort, user?.id ?? null, 20, 80),
  ]);

  const billCount = billCountRes.count ?? 0;
  const proposalCount = proposalCountRes.count ?? 0;

  return (
    <div className="space-y-10">
      {/* Compact hero */}
      <section className="space-y-3">
        <Badge variant="outline">Open civic data · advisory voting</Badge>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          Vote where you stand on every bill.
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A curated feed of U.S. federal legislation. Tap how you&apos;d vote, then see how
          others voted.{' '}
          <span className="font-medium text-foreground">Advisory civic signaling</span> —
          does not replace elections, referendums, or legislative votes.
        </p>
        <div className="max-w-2xl pt-1">
          <BillSearchBar size="lg" />
        </div>
      </section>

      {/* Main feed */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Your vote feed</h2>
            <p className="text-xs text-muted-foreground">
              Sorted by {sort === 'recent' ? 'recent activity' : sort === 'newest' ? 'date introduced' : sort === 'supported' ? 'most supported by FiveVote users' : 'most opposed by FiveVote users'}.
            </p>
          </div>
          <FeedSortPills current={sort} />
        </div>
        <div className="mx-auto max-w-2xl">
          <VoteFeed bills={feed} isSignedIn={!!user} />
        </div>
      </section>

      <Separator />

      {/* Section cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <SectionCard
          icon={<Landmark className="size-4 text-muted-foreground" />}
          badge={<Badge variant="default">Official</Badge>}
          title="Government bills"
          description="Active legislation pulled directly from Congress.gov."
          metric={billCount}
          metricLabel="tracked bills"
          href="/bills"
        />
        <SectionCard
          icon={<ScrollText className="size-4 text-muted-foreground" />}
          badge={<Badge variant="outline">Coming next</Badge>}
          title="Existing laws"
          description="Consolidated statutes from the U.S. Code."
          metric="—"
          metricLabel="not yet ingested"
          href="/bills"
          disabled
        />
        <SectionCard
          icon={<Users className="size-4 text-muted-foreground" />}
          badge={<Badge variant="secondary">Community</Badge>}
          title="Citizen proposals"
          description="Ideas authored by FiveVote users. Separately governed."
          metric={proposalCount}
          metricLabel="published proposals"
          href="/proposals"
        />
      </section>

      {/* Follow issues */}
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
          <Link href="/bills" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            All issues <ArrowRight />
          </Link>
        </div>
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
  if (disabled) return <div>{content}</div>;
  return <Link href={href}>{content}</Link>;
}
