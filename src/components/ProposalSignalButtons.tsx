'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, Clock, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { castProposalSignal, type ProposalSignal } from '@/app/proposals/actions';

type Counts = {
  support_count: number | null;
  not_now_count: number | null;
  needs_revision_count: number | null;
};

const SIGNALS: { key: ProposalSignal; label: string; Icon: typeof ThumbsUp }[] = [
  { key: 'support', label: 'Support', Icon: ThumbsUp },
  { key: 'not_now', label: 'Not now', Icon: Clock },
  { key: 'needs_revision', label: 'Needs revision', Icon: Pencil },
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
      <div className="flex flex-wrap gap-2">
        {SIGNALS.map(({ key, label, Icon }) => {
          const isOn = userSignal === key;
          const count =
            key === 'support'
              ? counts.support_count
              : key === 'not_now'
                ? counts.not_now_count
                : counts.needs_revision_count;
          return (
            <Button
              key={key}
              variant={isOn ? 'default' : 'outline'}
              size="sm"
              disabled={isPending || !isSignedIn}
              onClick={() => {
                if (!isSignedIn) return;
                startTransition(async () => {
                  const res = await castProposalSignal(proposalId, key);
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
          to record an advisory signal. Only one signal per proposal.
        </p>
      ) : null}
    </div>
  );
}
