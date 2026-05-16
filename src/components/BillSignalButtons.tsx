'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { castBillSignal, type BillSignal } from '@/app/bills/actions';

type Counts = {
  support_count: number | null;
  oppose_count: number | null;
  priority_count: number | null;
};

const SIGNALS: { key: BillSignal; label: string; colorOn: string; colorOff: string }[] = [
  {
    key: 'support',
    label: 'Support',
    colorOn: 'bg-emerald-600 text-white border-emerald-600',
    colorOff: 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50',
  },
  {
    key: 'oppose',
    label: 'Oppose',
    colorOn: 'bg-rose-600 text-white border-rose-600',
    colorOff: 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50',
  },
  {
    key: 'priority',
    label: 'High priority',
    colorOn: 'bg-amber-600 text-white border-amber-600',
    colorOff: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50',
  },
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
      <div className="flex flex-wrap gap-3">
        {SIGNALS.map((s) => {
          const isOn = userSignals.includes(s.key);
          const count =
            s.key === 'support'
              ? counts.support_count
              : s.key === 'oppose'
                ? counts.oppose_count
                : counts.priority_count;
          return (
            <button
              key={s.key}
              disabled={isPending || !isSignedIn}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${isOn ? s.colorOn : s.colorOff}`}
              onClick={() => {
                if (!isSignedIn) return;
                startTransition(async () => {
                  const res = await castBillSignal(billId, s.key);
                  if (!res.ok && res.error) alert(res.error);
                  router.refresh();
                });
              }}
            >
              {s.label} · {count ?? 0}
            </button>
          );
        })}
      </div>
      {!isSignedIn ? (
        <p className="text-xs text-neutral-600">
          <a href="/auth" className="text-blue-600 hover:underline">
            Sign in
          </a>{' '}
          to record an advisory signal.
        </p>
      ) : null}
    </div>
  );
}
