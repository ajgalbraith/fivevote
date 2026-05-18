import { ThumbsUp, ThumbsDown, Flame, Minus } from 'lucide-react';

import type { BillSignal } from '@/app/bills/actions';
import type { RecentVote } from '@/components/VoteFeed';

const SIGNAL_META: Record<BillSignal, { Icon: typeof ThumbsUp; color: string; label: string }> = {
  support: { Icon: ThumbsUp, color: 'text-emerald-700', label: 'supported' },
  oppose: { Icon: ThumbsDown, color: 'text-rose-700', label: 'opposed' },
  priority: { Icon: Flame, color: 'text-amber-700', label: 'flagged as priority' },
  neutral: { Icon: Minus, color: 'text-neutral-700', label: 'voted neutral on' },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  return `${mo}mo ago`;
}

export default function RecentVotesStrip({ votes }: { votes: RecentVote[] }) {
  if (votes.length === 0) return null;
  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
      <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Recent votes
      </div>
      <ul className="space-y-1 text-sm">
        {votes.slice(0, 3).map((v, i) => {
          const meta = SIGNAL_META[v.signal];
          return (
            <li key={i} className="flex items-center gap-2">
              <meta.Icon className={`size-3.5 ${meta.color}`} />
              <span className="font-medium">{v.display_name}</span>
              <span className="text-muted-foreground">{meta.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{timeAgo(v.created_at)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
