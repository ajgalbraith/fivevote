'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { FEED_SORTS, type FeedSort } from '@/lib/feed';

export default function FeedSortPills({ current }: { current: FeedSort }) {
  const params = useSearchParams();
  const q = params.get('q');

  const buildHref = (sort: FeedSort) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (sort !== 'recent') p.set('sort', sort);
    const s = p.toString();
    return s ? `/?${s}` : '/';
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {FEED_SORTS.map((s) => (
        <Link
          key={s.value}
          href={buildHref(s.value)}
          className={buttonVariants({
            variant: current === s.value ? 'default' : 'outline',
            size: 'sm',
          })}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
