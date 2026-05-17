import type { SupabaseClient } from '@supabase/supabase-js';

export type BillFilters = {
  q?: string;
  countries?: string[]; // 'US', 'CA'
  levels?: string[]; // 'federal', 'state', 'province', 'municipal'
  statuses?: string[];
  issues?: string[]; // issue_tag slugs
  since?: 'week' | 'month' | 'year' | 'all';
};

export function parseFilters(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): BillFilters {
  const get = (k: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(k) ?? undefined;
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const getAll = (k: string): string[] => {
    if (searchParams instanceof URLSearchParams) return searchParams.getAll(k);
    const v = searchParams[k];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.length > 0) return v.split(',');
    return [];
  };

  return {
    q: get('q') || undefined,
    countries: getAll('country'),
    levels: getAll('level'),
    statuses: getAll('status'),
    issues: getAll('issue'),
    since: (get('since') as BillFilters['since']) || 'all',
  };
}

export function filtersToSearchString(filters: BillFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  for (const c of filters.countries ?? []) params.append('country', c);
  for (const l of filters.levels ?? []) params.append('level', l);
  for (const s of filters.statuses ?? []) params.append('status', s);
  for (const i of filters.issues ?? []) params.append('issue', i);
  if (filters.since && filters.since !== 'all') params.set('since', filters.since);
  const s = params.toString();
  return s ? `?${s}` : '';
}

function sinceCutoff(since: BillFilters['since']): string | null {
  if (!since || since === 'all') return null;
  const now = new Date();
  const out = new Date(now);
  if (since === 'week') out.setDate(now.getDate() - 7);
  if (since === 'month') out.setMonth(now.getMonth() - 1);
  if (since === 'year') out.setFullYear(now.getFullYear() - 1);
  return out.toISOString();
}

export type BillListRow = {
  id: string;
  bill_number: string;
  chamber: string | null;
  session_label: string;
  title_en: string | null;
  status_code: string | null;
  latest_action_at: string | null;
  latest_action_text: string | null;
  jurisdictions: { name: string; country_code: string; level: string } | null;
  bill_issue_tags: { issue_tags: { slug: string; display_en: string } | { slug: string; display_en: string }[] | null }[];
};

function unwrapTag(t: BillListRow['bill_issue_tags'][number]): { slug: string; display_en: string } | null {
  const tg = t.issue_tags;
  if (!tg) return null;
  return Array.isArray(tg) ? tg[0] ?? null : tg;
}

export function bilTagSlugs(row: BillListRow): { slug: string; display_en: string }[] {
  return row.bill_issue_tags.map(unwrapTag).filter((t): t is { slug: string; display_en: string } => !!t);
}

export async function queryBills(
  supabase: SupabaseClient,
  filters: BillFilters,
  limit = 50,
): Promise<{ data: BillListRow[]; count: number | null }> {
  const useInnerJoin =
    (filters.countries?.length ?? 0) > 0 || (filters.levels?.length ?? 0) > 0;
  const jurisdictionRel = useInnerJoin
    ? 'jurisdictions!inner(name, country_code, level)'
    : 'jurisdictions(name, country_code, level)';

  let q = supabase
    .from('bills')
    .select(
      `id, bill_number, chamber, session_label, title_en, status_code, latest_action_at, latest_action_text, ${jurisdictionRel}, bill_issue_tags(issue_tags(slug, display_en))`,
      { count: 'exact' },
    )
    .order('latest_action_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (filters.q && filters.q.trim()) {
    const term = filters.q.trim();
    q = q.or(`title_en.ilike.%${term}%,bill_number.ilike.%${term}%`);
  }
  if (filters.statuses && filters.statuses.length) {
    q = q.in('status_code', filters.statuses);
  }
  const cutoff = sinceCutoff(filters.since);
  if (cutoff) q = q.gte('latest_action_at', cutoff);

  // Country/level filters require a join filter through jurisdictions:
  if (filters.countries && filters.countries.length) {
    q = q.in('jurisdictions.country_code', filters.countries);
  }
  if (filters.levels && filters.levels.length) {
    q = q.in('jurisdictions.level', filters.levels);
  }

  const { data, count, error } = await q;
  if (error) throw error;

  let rows = (data ?? []).map((row) => ({
    ...row,
    jurisdictions: Array.isArray(row.jurisdictions)
      ? row.jurisdictions[0] ?? null
      : row.jurisdictions ?? null,
  })) as unknown as BillListRow[];

  // Filter by issue tags client-side because we joined a nested table.
  let effectiveCount = count ?? rows.length;
  if (filters.issues && filters.issues.length) {
    const set = new Set(filters.issues);
    rows = rows.filter((b) =>
      bilTagSlugs(b).some((t) => set.has(t.slug)),
    );
    effectiveCount = rows.length;
  }

  return { data: rows, count: effectiveCount };
}

export async function listIssueTagsWithCounts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('issue_tags')
    .select('id, slug, display_en')
    .order('display_en');
  if (error) throw error;
  return data ?? [];
}

export async function listAvailableStatuses(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('status_code')
    .not('status_code', 'is', null);
  if (error) return [];
  const set = new Set<string>();
  data?.forEach((r) => r.status_code && set.add(r.status_code));
  return [...set].sort();
}
