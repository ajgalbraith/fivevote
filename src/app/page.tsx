import Link from 'next/link';
import { Landmark, Users, ArrowRight } from 'lucide-react';

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
    <div className="space-y-12">
      <section className="space-y-4">
        <Badge variant="outline">Open civic data · advisory voting</Badge>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight">
          Track legislation.<br />Surface community ideas.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          FiveVote tracks official bills from U.S. Congress and Canada&apos;s Parliament,
          and lets the public propose ideas of their own. Voting here is{' '}
          <span className="font-medium text-foreground">advisory civic signaling</span>
          {' '}&mdash; it does not enact law.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="group transition hover:border-foreground/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-muted-foreground" />
              <Badge variant="default">Official</Badge>
            </div>
            <CardTitle>Government bills</CardTitle>
            <CardDescription>
              Pulled directly from Congress.gov with full source provenance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-3xl font-semibold tabular-nums">
              {billCount ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">tracked bills</div>
          </CardContent>
          <CardFooter>
            <Link
              href="/bills"
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'ml-auto' })}
            >
              Browse <ArrowRight />
            </Link>
          </CardFooter>
        </Card>

        <Card className="group transition hover:border-foreground/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <Badge variant="secondary">Community</Badge>
            </div>
            <CardTitle>Citizen proposals</CardTitle>
            <CardDescription>
              Ideas authored by FiveVote users. Clearly labeled. Separately governed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-3xl font-semibold tabular-nums">
              {proposalCount ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">published proposals</div>
          </CardContent>
          <CardFooter>
            <Link
              href="/proposals"
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'ml-auto' })}
            >
              Browse <ArrowRight />
            </Link>
          </CardFooter>
        </Card>
      </section>

      <Separator />

      <section className="max-w-2xl space-y-2">
        <h2 className="text-base font-semibold">Why FiveVote separates these</h2>
        <p className="text-sm text-muted-foreground">
          Lawmaking happens through legislatures and ballot processes &mdash; not through
          private apps. We never present a community tally as &ldquo;passing&rdquo; or
          &ldquo;defeating&rdquo; a law. Government bills are kept distinct from
          user-authored proposals in storage, in moderation, and in this UI.
        </p>
      </section>
    </div>
  );
}
