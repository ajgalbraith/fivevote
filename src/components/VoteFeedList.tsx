'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ThumbsUp, ThumbsDown, Flame, Minus, Landmark, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  castBillSignal,
  type BillSignal,
  type SignalCounts,
} from '@/app/bills/actions';
import type { FeedBill } from '@/components/VoteFeed';

const SIGNALS: {
  key: BillSignal;
  label: string;
  Icon: typeof ThumbsUp;
  barColor: string;
  onColor: string;
}[] = [
  {
    key: 'support',
    label: 'Support',
    Icon: ThumbsUp,
    barColor: 'bg-emerald-600',
    onColor: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    Icon: Minus,
    barColor: 'bg-neutral-400',
    onColor: 'bg-neutral-700 text-white border-neutral-700 hover:bg-neutral-800',
  },
  {
    key: 'oppose',
    label: 'Oppose',
    Icon: ThumbsDown,
    barColor: 'bg-rose-600',
    onColor: 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700',
  },
  {
    key: 'priority',
    label: 'Priority',
    Icon: Flame,
    barColor: 'bg-amber-600',
    onColor: 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700',
  },
];

type RowState = {
  counts: SignalCounts;
  userSignals: BillSignal[];
  revealed: boolean;
};

function totalVotes(c: SignalCounts) {
  return c.support + c.oppose + c.priority + c.neutral;
}

export default function VoteFeedList({
  bills,
  isSignedIn,
}: {
  bills: FeedBill[];
  isSignedIn: boolean;
}) {
  const [states, setStates] = useState<Map<string, RowState>>(() => {
    const m = new Map<string, RowState>();
    for (const b of bills) {
      m.set(b.id, {
        counts: b.counts,
        userSignals: b.userSignals,
        revealed: b.userSignals.length > 0,
      });
    }
    return m;
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No bills ready for voting yet.
        </CardContent>
      </Card>
    );
  }

  const cast = (billId: string, signal: BillSignal) => {
    if (!isSignedIn) return;
    setPendingId(billId);
    startTransition(async () => {
      const res = await castBillSignal(billId, signal);
      setPendingId(null);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      setStates((prev) => {
        const m = new Map(prev);
        m.set(billId, {
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
      {bills.map((bill) => {
        const state = states.get(bill.id)!;
        const total = totalVotes(state.counts);
        const isPending = pendingId === bill.id;
        return (
          <Card key={bill.id} className="overflow-hidden">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="default" className="gap-1">
                  <Landmark className="size-3" /> Official
                </Badge>
                <span className="font-mono font-medium text-foreground">
                  {bill.bill_number}
                </span>
                {bill.chamber ? <span>· {bill.chamber}</span> : null}
                <span>· {bill.session_label}</span>
                <Link
                  href={`/bills/${bill.id}`}
                  className="ml-auto inline-flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  Details <ExternalLink className="size-3" />
                </Link>
              </div>

              <div className="font-medium leading-snug">{bill.title_en ?? '(untitled)'}</div>

              {bill.plain_english_summary ? (
                <p className="line-clamp-3 text-sm text-foreground/90">
                  {bill.plain_english_summary}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {bill.sponsor_name ? (
                  <span>
                    Sponsored by{' '}
                    <span className="font-medium text-foreground">{bill.sponsor_name}</span>
                  </span>
                ) : null}
                {bill.issue_labels.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {bill.issue_labels.slice(0, 3).map((l) => (
                      <Badge key={l} variant="outline" className="font-normal text-[0.7rem]">
                        {l}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {SIGNALS.map(({ key, label, Icon, onColor }) => {
                  const isOn = state.userSignals.includes(key);
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={isOn ? 'default' : 'outline'}
                      disabled={isPending || !isSignedIn}
                      className={isOn ? onColor : ''}
                      onClick={() => cast(bill.id, key)}
                    >
                      <Icon />
                      {label}
                      <span className="ml-1 font-mono text-[0.7rem] tabular-nums opacity-70">
                        {state.counts[key]}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {state.revealed && total > 0 ? (
                <div className="space-y-1 pt-1">
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    {SIGNALS.map(({ key, barColor }) => {
                      const pct = total > 0 ? (state.counts[key] / total) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={key}
                          className={`${barColor} transition-[width] duration-300`}
                          style={{ width: `${pct}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="text-[0.7rem] text-muted-foreground">
                    {total} {total === 1 ? 'response' : 'responses'} ·{' '}
                    {Math.round((state.counts.support / total) * 100)}% support ·{' '}
                    {Math.round((state.counts.oppose / total) * 100)}% oppose
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
