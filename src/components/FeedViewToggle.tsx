'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LayoutList, Layers } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FeedView } from '@/lib/feed';

const VIEWS: { value: FeedView; label: string; Icon: typeof LayoutList }[] = [
  { value: 'deck', label: 'Deck', Icon: Layers },
  { value: 'list', label: 'List', Icon: LayoutList },
];

export default function FeedViewToggle({ current }: { current: FeedView }) {
  const params = useSearchParams();
  const q = params.get('q');
  const sort = params.get('sort');

  const buildHref = (v: FeedView) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (sort) p.set('sort', sort);
    if (v !== 'deck') p.set('view', v);
    const s = p.toString();
    return s ? `/?${s}` : '/';
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
      {VIEWS.map(({ value, label, Icon }) => (
        <Link
          key={value}
          href={buildHref(value)}
          aria-label={`${label} view`}
          className={cn(
            buttonVariants({
              variant: current === value ? 'default' : 'ghost',
              size: 'sm',
            }),
            'gap-1.5 px-2.5',
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </Link>
      ))}
    </div>
  );
}
