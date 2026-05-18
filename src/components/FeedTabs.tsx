'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Flame, Vote } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FeedTab } from '@/lib/feed';

const TABS: { value: FeedTab; label: string; Icon: typeof Vote }[] = [
  { value: 'feed', label: 'Vote feed', Icon: Vote },
  { value: 'hot', label: 'Hot issues', Icon: Flame },
];

export default function FeedTabs({ current }: { current: FeedTab }) {
  const params = useSearchParams();
  const q = params.get('q');

  const href = (tab: FeedTab) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (tab !== 'feed') p.set('tab', tab);
    const s = p.toString();
    return s ? `/?${s}` : '/';
  };

  return (
    <div className="inline-flex items-center border-b border-border">
      {TABS.map(({ value, label, Icon }) => (
        <Link
          key={value}
          href={href(value)}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
            current === value
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </div>
  );
}
