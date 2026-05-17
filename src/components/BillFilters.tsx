'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Filter, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type IssueTag = { slug: string; display_en: string };

export type BillFiltersProps = {
  issueTags: IssueTag[];
  statuses: string[];
  initial: {
    q?: string;
    countries: string[];
    levels: string[];
    statuses: string[];
    issues: string[];
    since: string;
  };
};

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
];
const LEVELS = [
  { value: 'federal', label: 'Federal' },
  { value: 'state', label: 'State' },
  { value: 'province', label: 'Province' },
  { value: 'municipal', label: 'Municipal' },
];
const SINCE_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'year', label: 'Last year' },
];

function useMultiToggle(initial: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const toggle = (val: string) => {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setSelected(next);
  };
  return { selected, toggle, reset: () => setSelected(new Set()) };
}

export default function BillFilters({ issueTags, statuses, initial }: BillFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const countries = useMultiToggle(initial.countries);
  const levels = useMultiToggle(initial.levels);
  const statusSel = useMultiToggle(initial.statuses);
  const issues = useMultiToggle(initial.issues);
  const [since, setSince] = useState(initial.since || 'all');

  const apply = () => {
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    if (q) params.set('q', q);
    countries.selected.forEach((c) => params.append('country', c));
    levels.selected.forEach((l) => params.append('level', l));
    statusSel.selected.forEach((s) => params.append('status', s));
    issues.selected.forEach((i) => params.append('issue', i));
    if (since !== 'all') params.set('since', since);
    startTransition(() => {
      router.push(`/bills${params.toString() ? `?${params}` : ''}`);
    });
  };

  const reset = () => {
    countries.reset();
    levels.reset();
    statusSel.reset();
    issues.reset();
    setSince('all');
    const q = searchParams.get('q');
    startTransition(() => {
      router.push(`/bills${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    });
  };

  const activeCount =
    countries.selected.size +
    levels.selected.size +
    statusSel.selected.size +
    issues.selected.size +
    (since !== 'all' ? 1 : 0);

  const content = (
    <div className="space-y-6">
      <FilterGroup title="Country">
        {COUNTRIES.map((c) => (
          <CheckRow
            key={c.value}
            id={`c-${c.value}`}
            label={c.label}
            checked={countries.selected.has(c.value)}
            onChange={() => countries.toggle(c.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Level">
        {LEVELS.map((l) => (
          <CheckRow
            key={l.value}
            id={`l-${l.value}`}
            label={l.label}
            checked={levels.selected.has(l.value)}
            onChange={() => levels.toggle(l.value)}
          />
        ))}
      </FilterGroup>

      {statuses.length > 0 ? (
        <FilterGroup title="Status">
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {statuses.map((s) => (
              <CheckRow
                key={s}
                id={`s-${s}`}
                label={s}
                checked={statusSel.selected.has(s)}
                onChange={() => statusSel.toggle(s)}
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      <FilterGroup title="Issue">
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {issueTags.map((t) => (
            <CheckRow
              key={t.slug}
              id={`i-${t.slug}`}
              label={t.display_en}
              checked={issues.selected.has(t.slug)}
              onChange={() => issues.toggle(t.slug)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Activity">
        <div className="space-y-1.5">
          {SINCE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="since"
                checked={since === opt.value}
                onChange={() => setSince(opt.value)}
                className="size-3.5 accent-foreground"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </FilterGroup>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button size="sm" onClick={apply} disabled={isPending}>
          Apply filters
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} disabled={isPending}>
          <X /> Clear
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block">
        <div className="sticky top-24 space-y-1">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Filters</h2>
            {activeCount > 0 ? (
              <span className="text-xs text-muted-foreground">{activeCount} active</span>
            ) : null}
          </div>
          {content}
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm">
                <Filter />
                Filters
                {activeCount > 0 ? (
                  <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {activeCount}
                  </span>
                ) : null}
              </Button>
            }
          />
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter bills</SheetTitle>
              <SheetDescription>Narrow by country, level, status, or issue.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">{content}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Label>
      {children}
    </div>
  );
}

function CheckRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <span className="leading-none">{label}</span>
    </label>
  );
}
