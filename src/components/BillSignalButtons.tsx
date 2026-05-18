'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, ThumbsDown, Flame, Minus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { castBillSignal, type BillSignal } from '@/app/bills/actions';

type Counts = {
  support_count: number | null;
  oppose_count: number | null;
  priority_count: number | null;
  neutral_count: number | null;
};

const SIGNALS: { key: BillSignal; label: string; Icon: typeof ThumbsUp }[] = [
  { key: 'support', label: 'Support', Icon: ThumbsUp },
  { key: 'neutral', label: 'Neutral', Icon: Minus },
  { key: 'oppose', label: 'Oppose', Icon: ThumbsDown },
  { key: 'priority', label: 'High priority', Icon: Flame },
];

export default function BillSignalButtons({
  billId,
  isSignedIn,
  counts,
  userSignals,
}: {
  billId: string;
  isSignedIn: boolean;
  counts: Counts;
  userSignals: BillSignal[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SIGNALS.map(({ key, label, Icon }) => {
          const isOn = userSignals.includes(key);
          const count =
            key === 'support'
              ? counts.support_count
              : key === 'oppose'
                ? counts.oppose_count
                : key === 'priority'
                  ? counts.priority_count
                  : counts.neutral_count;
          return (
            <Button
              key={key}
              variant={isOn ? 'default' : 'outline'}
              size="sm"
              disabled={isPending || !isSignedIn}
              onClick={() => {
                if (!isSignedIn) return;
                startTransition(async () => {
                  const res = await castBillSignal(billId, key);
                  if (!res.ok && res.error) alert(res.error);
                  router.refresh();
                });
              }}
            >
              <Icon />
              {label}
              <span className="ml-1 font-mono text-xs tabular-nums opacity-70">
                {count ?? 0}
              </span>
            </Button>
          );
        })}
      </div>
      {!isSignedIn ? (
        <p className="text-xs text-muted-foreground">
          <a href="/auth" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </a>{' '}
          to record an advisory signal.
        </p>
      ) : null}
    </div>
  );
}
