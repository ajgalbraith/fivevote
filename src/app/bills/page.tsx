import Link from 'next/link';
import { Landmark, FileText, Filter as FilterIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import BillSearchBar from '@/components/BillSearchBar';
import BillFilters from '@/components/BillFilters';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  bilTagSlugs,
  billSponsor,
  listAvailableStatuses,
  listIssueTagsWithCounts,
  parseFilters,
  queryBills,
} from '@/lib/bills/query';

export const dynamic = 'force-dynamic';

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const supabase = await getSupabaseServerClient();

  let bills: Awaited<ReturnType<typeof queryBills>>['data'] = [];
  let count = 0;
  let queryError: string | null = null;
  try {
    const res = await queryBills(supabase, filters);
    bills = res.data;
    count = res.count ?? 0;
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }
  const [issueTags, statuses] = await Promise.all([
    listIssueTagsWithCounts(supabase),
    listAvailableStatuses(supabase),
  ]);

  const activeFilterCount =
    (filters.countries?.length ?? 0) +
    (filters.levels?.length ?? 0) +
    (filters.statuses?.length ?? 0) +
    (filters.issues?.length ?? 0) +
    (filters.since && filters.since !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1">
            <Landmark className="size-3" /> Official
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Government bills</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pulled from official sources with provenance preserved. Advisory voting only.
        </p>
        <div className="max-w-2xl">
          <BillSearchBar />
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
        <BillFilters
          issueTags={issueTags}
          statuses={statuses}
          initial={{
            q: filters.q,
            countries: filters.countries ?? [],
            levels: filters.levels ?? [],
            statuses: filters.statuses ?? [],
            issues: filters.issues ?? [],
            since: filters.since ?? 'all',
          }}
        />

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FilterIcon className="size-3.5" />
              {bills.length} of {count ?? bills.length} bills
              {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active` : ''}
            </div>
          </div>

          {queryError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load bills</AlertTitle>
              <AlertDescription>{queryError}</AlertDescription>
            </Alert>
          ) : bills.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <FileText className="size-8 text-muted-foreground/60" />
                <div>No bills match these filters.</div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {bills.map((b) => {
                const j = b.jurisdictions;
                const tags = bilTagSlugs(b);
                const sponsor = billSponsor(b);
                return (
                  <Link key={b.id} href={`/bills/${b.id}`} className="block">
                    <Card className="transition hover:border-foreground/20">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="default" className="gap-1">
                            <Landmark className="size-3" /> Official
                          </Badge>
                          {j ? (
                            <Badge variant="outline" className="font-normal">
                              {j.country_code} · {j.level}
                            </Badge>
                          ) : null}
                          <span className="font-mono font-medium text-foreground">
                            {b.bill_number}
                          </span>
                          {b.chamber ? <span>· {b.chamber}</span> : null}
                          <span>· {b.session_label}</span>
                          {b.status_code ? (
                            <Badge variant="secondary" className="ml-auto font-normal">
                              {b.status_code}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="font-medium leading-snug">
                          {b.title_en ?? '(untitled)'}
                        </div>
                        {sponsor ? (
                          <div className="text-xs text-muted-foreground">
                            Sponsored by{' '}
                            <span className="font-medium text-foreground">
                              {sponsor.name}
                            </span>
                            {sponsor.party || sponsor.state_or_province ? (
                              <span>
                                {' '}({[sponsor.party, sponsor.state_or_province].filter(Boolean).join('-')})
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {b.latest_action_text ? (
                          <div className="line-clamp-2 text-sm text-muted-foreground">
                            Latest: {b.latest_action_text}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {tags.map((t) => (
                            <Badge key={t.slug} variant="outline" className="font-normal text-[0.7rem]">
                              {t.display_en}
                            </Badge>
                          ))}
                          {b.latest_action_at ? (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {new Date(b.latest_action_at).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
