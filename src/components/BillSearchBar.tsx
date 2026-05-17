'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

export default function BillSearchBar({ size = 'default' }: { size?: 'default' | 'lg' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams);
        if (q.trim()) params.set('q', q.trim());
        else params.delete('q');
        startTransition(() => router.push(`/bills${params.toString() ? `?${params}` : ''}`));
      }}
    >
      <InputGroup className={size === 'lg' ? 'h-12 text-base' : ''}>
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            size === 'lg'
              ? 'Search bills, laws, proposals…'
              : 'Search bill number or title'
          }
          aria-label="Search bills"
        />
      </InputGroup>
    </form>
  );
}
