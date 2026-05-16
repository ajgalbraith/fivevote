'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { castProposalSignal, type ProposalSignal } from '@/app/proposals/actions';

type Counts = {
  support_count: number | null;
  not_now_count: number | null;
  needs_revision_count: number | null;
};

const SIGNALS: { key: ProposalSignal; label: string; on: string; off: string }[] = [
  {
    key: 'support',
    label: 'Support',
    on: 'bg-emerald-600 text-white border-emerald-600',
    off: 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50',
  },
  {
    key: 'not_now',
    label: 'Not now',
    on: 'bg-neutral-700 text-white border-neutral-700',
    off: 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100',
  },
  {
    key: 'needs_revision',
    label: 'Needs revision',
    on: 'bg-amber-600 text-white border-amber-600',
    off: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50',
  },
];

export default function ProposalSignalButtons({
  proposalId,
  isSignedIn,
  counts,
  userSignal,
}: {
  proposalId: string;
  isSignedIn: boolean;
  counts: Counts;
  userSignal?: ProposalSignal;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {SIGNALS.map((s) => {
          const isOn = userSignal === s.key;
          const count =
            s.key === 'support'
              ? counts.support_count
              : s.key === 'not_now'
                ? counts.not_now_count
                : counts.needs_revision_count;
          return (
            <button
              key={s.key}
              disabled={isPending || !isSignedIn}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${isOn ? s.on : s.off}`}
              onClick={() => {
                if (!isSignedIn) return;
                startTransition(async () => {
                  const res = await castProposalSignal(proposalId, s.key);
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
          to record an advisory signal. Only one signal per proposal.
        </p>
      ) : null}
    </div>
  );
}
