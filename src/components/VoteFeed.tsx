'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ThumbsUp,
  ThumbsDown,
  Flame,
  Minus,
  ArrowRight,
  SkipForward,
  Landmark,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import RecentVotesStrip from '@/components/RecentVotesStrip';
import {
  castBillSignal,
  type BillSignal,
  type SignalCounts,
} from '@/app/bills/actions';

export type RecentVote = {
  signal: BillSignal;
  display_name: string;
  created_at: string;
};

export type FeedBill = {
  id: string;
  bill_number: string;
  chamber: string | null;
  session_label: string;
  title_en: string | null;
  plain_english_summary: string | null;
  sponsor_name: string | null;
  issue_labels: string[];
  counts: SignalCounts;
  userSignals: BillSignal[];
  recentVotes: RecentVote[];
};

const SIGNALS: {
  key: BillSignal;
  label: string;
  Icon: typeof ThumbsUp;
  barColor: string;
  buttonOnColor: string;
}[] = [
  {
    key: 'support',
    label: 'Support',
    Icon: ThumbsUp,
    barColor: 'bg-emerald-600',
    buttonOnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    Icon: Minus,
    barColor: 'bg-neutral-400',
    buttonOnColor: 'bg-neutral-700 hover:bg-neutral-800 text-white border-neutral-700',
  },
  {
    key: 'oppose',
    label: 'Oppose',
    Icon: ThumbsDown,
    barColor: 'bg-rose-600',
    buttonOnColor: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600',
  },
  {
    key: 'priority',
    label: 'Priority',
    Icon: Flame,
    barColor: 'bg-amber-600',
    buttonOnColor: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
  },
];

type CardState = {
  counts: SignalCounts;
  userSignals: BillSignal[];
  revealed: boolean;
};

function totalVotes(c: SignalCounts) {
  return c.support + c.oppose + c.priority + c.neutral;
}

export default function VoteFeed({
  bills,
  isSignedIn,
}: {
  bills: FeedBill[];
  isSignedIn: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<Map<string, CardState>>(() => {
    const m = new Map<string, CardState>();
    for (const b of bills) {
      m.set(b.id, {
        counts: b.counts,
        userSignals: b.userSignals,
        revealed: b.userSignals.length > 0,
      });
    }
    return m;
  });
  const [isPending, startTransition] = useTransition();

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center text-sm text-muted-foreground">
          No bills ready for voting yet.
        </CardContent>
      </Card>
    );
  }

  if (index >= bills.length) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="space-y-3 py-12 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <div className="text-lg font-semibold">You&apos;re all caught up.</div>
          <div className="text-sm text-muted-foreground">
            You worked through {bills.length} bills. Reload for a fresh batch, or browse all of them.
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIndex(0)}>
              <RotateCcw />
              Restart
            </Button>
            <Link href="/bills" className={buttonVariants({ size: 'sm' })}>
              Browse all bills <ArrowRight />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bill = bills[index];
  const state = states.get(bill.id)!;
  const total = totalVotes(state.counts);

  const next = () => setIndex((i) => Math.min(i + 1, bills.length));

  const cast = (signal: BillSignal) => {
    if (!isSignedIn) return;
    startTransition(async () => {
      const res = await castBillSignal(bill.id, signal);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      setStates((prev) => {
        const m = new Map(prev);
        m.set(bill.id, {
          counts: res.counts,
          userSignals: res.userSignals,
          revealed: true,
        });
        return m;
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Cast a signal · reload for new bills</span>
        <div className="flex h-1.5 flex-1 mx-4 overflow-hidden rounded-full bg-muted">
          <div
            className="bg-foreground transition-[width] duration-200"
            style={{ width: `${((index + (state.revealed ? 1 : 0)) / bills.length) * 100}%` }}
          />
        </div>
        <Link href={`/bills/${bill.id}`} className="hover:text-foreground hover:underline">
          Open
        </Link>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="default" className="gap-1">
              <Landmark className="size-3" /> Official
            </Badge>
            <span className="font-mono font-medium text-foreground">{bill.bill_number}</span>
            {bill.chamber ? <span>· {bill.chamber}</span> : null}
            <span>· {bill.session_label}</span>
          </div>

          <h2 className="text-xl font-semibold leading-snug">
            {bill.plain_english_summary ?? bill.title_en ?? '(untitled)'}
          </h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {bill.sponsor_name ? (
              <span>
                Sponsored by{' '}
                <span className="font-medium text-foreground">{bill.sponsor_name}</span>
              </span>
            ) : null}
            {bill.issue_labels.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                {bill.issue_labels.map((l) => (
                  <Badge key={l} variant="outline" className="font-normal text-[0.7rem]">
                    {l}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {/* Vote buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 md:grid-cols-4">
            {SIGNALS.map(({ key, label, Icon, buttonOnColor }) => {
              const isOn = state.userSignals.includes(key);
              return (
                <Button
                  key={key}
                  size="lg"
                  disabled={isPending || !isSignedIn}
                  className={`h-12 w-full ${isOn ? buttonOnColor : ''}`}
                  variant={isOn ? 'default' : 'outline'}
                  onClick={() => cast(key)}
                >
                  <Icon />
                  {label}
                </Button>
              );
            })}
          </div>

          {!isSignedIn ? (
            <p className="text-center text-xs text-muted-foreground">
              <Link
                href="/auth?next=/"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>{' '}
              to cast a signal.
            </p>
          ) : null}

          {/* Recent community votes */}
          <RecentVotesStrip votes={bill.recentVotes} />

          {/* Revealed results */}
          {state.revealed ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">How others voted</span>
                <span className="text-xs text-muted-foreground">
                  {total} {total === 1 ? 'response' : 'responses'}
                </span>
              </div>
              {SIGNALS.map(({ key, label, barColor }) => {
                const count = state.counts[key];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{label}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {pct}% · {count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-background">
                      <div
                        className={`h-full ${barColor} transition-[width] duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={next}>
          <SkipForward />
          Skip
        </Button>
        <Button size="sm" onClick={next} disabled={!state.revealed}>
          Next <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
