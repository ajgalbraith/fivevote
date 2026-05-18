import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ThumbsUp,
  ThumbsDown,
  Flame,
  Minus,
  Vote,
  Users,
  Bell,
  ChevronRight,
  Landmark,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import SignOutButton from '@/components/SignOutButton';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { BillSignal } from '@/app/bills/actions';

export const dynamic = 'force-dynamic';

type SignalRow = {
  signal: BillSignal;
  created_at: string;
  bills:
    | { id: string; bill_number: string; title_en: string | null; plain_english_summary: string | null }
    | { id: string; bill_number: string; title_en: string | null; plain_english_summary: string | null }[]
    | null;
};

type ProposalRow = {
  id: string;
  title: string;
  plain_language_summary: string | null;
  status: string;
  moderation_state: string;
  published_at: string | null;
  created_at: string;
};

const SIGNAL_META: Record<BillSignal, { label: string; Icon: typeof ThumbsUp; color: string }> = {
  support: { label: 'Support', Icon: ThumbsUp, color: 'text-emerald-700' },
  oppose: { label: 'Oppose', Icon: ThumbsDown, color: 'text-rose-700' },
  priority: { label: 'High priority', Icon: Flame, color: 'text-amber-700' },
  neutral: { label: 'Neutral', Icon: Minus, color: 'text-neutral-700' },
};

const SIGNAL_ORDER: BillSignal[] = ['support', 'oppose', 'priority', 'neutral'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+|@|\./).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
}

export default async function ProfilePage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/profile');

  const [profileRes, votesRes, proposalsRes, followsRes] = await Promise.all([
    supabase.from('profiles').select('display_name, trust_level, is_moderator').eq('id', user.id).maybeSingle(),
    supabase
      .from('bill_signals')
      .select(
        'signal, created_at, bills(id, bill_number, title_en, plain_english_summary)',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_proposals')
      .select('id, title, plain_language_summary, status, moderation_state, published_at, created_at')
      .eq('author_user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notification_subscriptions')
      .select('target_kind', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const profile = profileRes.data;
  const votes = (votesRes.data ?? []) as SignalRow[];
  const proposals = (proposalsRes.data ?? []) as ProposalRow[];
  const followingCount = followsRes.count ?? 0;

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'You';
  const counts = SIGNAL_ORDER.reduce<Record<BillSignal, number>>(
    (acc, s) => ({ ...acc, [s]: 0 }),
    { support: 0, oppose: 0, priority: 0, neutral: 0 },
  );
  for (const v of votes) counts[v.signal] += 1;
  const totalVotes = votes.length;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-start gap-6">
        <Avatar className="size-20 text-xl">
          <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
            {profile?.is_moderator ? (
              <Badge variant="default">Moderator</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Vote className="size-4 text-muted-foreground" />} label="Total votes" value={totalVotes} />
        <StatCard
          icon={<Users className="size-4 text-muted-foreground" />}
          label="Proposals"
          value={proposals.length}
        />
        <StatCard
          icon={<Bell className="size-4 text-muted-foreground" />}
          label="Following"
          value={followingCount}
        />
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Vote mix</div>
            <div className="flex items-center gap-3 text-xs">
              {SIGNAL_ORDER.map((s) => {
                const meta = SIGNAL_META[s];
                return (
                  <span key={s} className={`inline-flex items-center gap-1 ${meta.color}`}>
                    <meta.Icon className="size-3.5" />
                    <span className="font-mono tabular-nums">{counts[s]}</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* My votes */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <Vote className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">My votes</h2>
            <span className="text-xs text-muted-foreground">{totalVotes}</span>
          </div>
          <Link
            href="/votes"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            View all <ChevronRight className="inline size-3" />
          </Link>
        </div>
        {votes.length === 0 ? (
          <Card>
            <CardContent className="space-y-2 py-8 text-center text-sm text-muted-foreground">
              <div>You haven&apos;t voted yet.</div>
              <Link href="/" className={buttonVariants({ size: 'sm' })}>
                Start voting
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {votes.slice(0, 8).map((v, i) => {
              const bill = Array.isArray(v.bills) ? v.bills[0] : v.bills;
              if (!bill) return null;
              const meta = SIGNAL_META[v.signal];
              return (
                <Link key={`${bill.id}-${i}`} href={`/bills/${bill.id}`} className="block">
                  <Card className="transition hover:border-foreground/20">
                    <CardContent className="space-y-1 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`inline-flex items-center gap-1 font-medium ${meta.color}`}>
                          <meta.Icon className="size-3.5" />
                          {meta.label}
                        </span>
                        <Badge variant="outline" className="font-mono font-normal">
                          {bill.bill_number}
                        </Badge>
                        <span className="ml-auto text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm leading-snug">
                        {bill.plain_english_summary ?? bill.title_en ?? '(untitled)'}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* My proposals */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">My proposals</h2>
            <span className="text-xs text-muted-foreground">{proposals.length}</span>
          </div>
          <Link href="/proposals/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            New proposal
          </Link>
        </div>
        {proposals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              You haven&apos;t written any community proposals yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {proposals.map((p) => (
              <Link key={p.id} href={`/proposals/${p.id}`} className="block">
                <Card className="transition hover:border-foreground/20">
                  <CardContent className="space-y-1 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="gap-1">
                        <Landmark className="size-3" /> {p.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                      {p.moderation_state === 'pending' ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                          pending review
                        </Badge>
                      ) : p.moderation_state === 'approved' ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-900">
                          approved
                        </Badge>
                      ) : p.moderation_state === 'rejected' ? (
                        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-900">
                          rejected
                        </Badge>
                      ) : null}
                      <span className="ml-auto">
                        {new Date(p.published_at ?? p.created_at).toLocaleDateString()}
                      </span>
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="font-mono text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
