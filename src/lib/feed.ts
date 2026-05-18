import type { SupabaseClient } from '@supabase/supabase-js';

import { billSponsor, type BillListRow } from '@/lib/bills/query';
import type { FeedBill, RecentVote } from '@/components/VoteFeed';
import type { BillSignal, SignalCounts } from '@/app/bills/actions';

export type FeedSort = 'interesting' | 'recent' | 'newest' | 'supported' | 'opposed';

export const FEED_SORTS: { value: FeedSort; label: string }[] = [
  { value: 'interesting', label: 'Interesting' },
  { value: 'recent', label: 'Recent activity' },
  { value: 'newest', label: 'Newest' },
  { value: 'supported', label: 'Most supported' },
  { value: 'opposed', label: 'Most opposed' },
];

export function parseSort(s: string | null | undefined): FeedSort {
  if (
    s === 'interesting' ||
    s === 'newest' ||
    s === 'supported' ||
    s === 'opposed' ||
    s === 'recent'
  )
    return s;
  return 'interesting';
}

export type FeedView = 'deck' | 'list';

export function parseView(s: string | null | undefined): FeedView {
  return s === 'list' ? 'list' : 'deck';
}

export type FeedTab = 'feed' | 'hot';

export function parseTab(s: string | null | undefined): FeedTab {
  return s === 'hot' ? 'hot' : 'feed';
}

export type TrendingBill = {
  id: string;
  bill_number: string;
  title_en: string | null;
  plain_english_summary: string | null;
  sponsor_name: string | null;
  issue_labels: string[];
  counts: SignalCounts;
  total: number;
};

export async function loadTrending(
  supabase: SupabaseClient,
  limit = 15,
): Promise<TrendingBill[]> {
  // Order bills by total signal count via the counts view.
  const { data: countRows } = await supabase
    .from('bill_signal_counts')
    .select('bill_id, support_count, oppose_count, priority_count, neutral_count');

  const totals = (countRows ?? [])
    .map((r) => ({
      bill_id: r.bill_id as string,
      counts: {
        support: r.support_count ?? 0,
        oppose: r.oppose_count ?? 0,
        priority: r.priority_count ?? 0,
        neutral: r.neutral_count ?? 0,
      },
      total:
        (r.support_count ?? 0) +
        (r.oppose_count ?? 0) +
        (r.priority_count ?? 0) +
        (r.neutral_count ?? 0),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  if (totals.length === 0) return [];

  const ids = totals.map((t) => t.bill_id);
  const { data: bills } = await supabase
    .from('bills')
    .select(
      'id, bill_number, title_en, plain_english_summary, bill_issue_tags(issue_tags(slug, display_en)), sponsorships(role, persons(id, name, party, state_or_province))',
    )
    .in('id', ids);

  const byId = new Map<string, BillListRow>();
  for (const b of (bills ?? []) as unknown as BillListRow[]) byId.set(b.id, b);

  return totals
    .map((t) => {
      const b = byId.get(t.bill_id);
      if (!b) return null;
      const sponsor = billSponsor(b);
      const tags = b.bill_issue_tags
        .map((x) => (Array.isArray(x.issue_tags) ? x.issue_tags[0] : x.issue_tags))
        .filter((x): x is { slug: string; display_en: string } => !!x);
      return {
        id: b.id,
        bill_number: b.bill_number,
        title_en: b.title_en,
        plain_english_summary: b.plain_english_summary,
        sponsor_name: sponsor?.name ?? null,
        issue_labels: tags.map((t) => t.display_en),
        counts: t.counts,
        total: t.total,
      } satisfies TrendingBill;
    })
    .filter((r): r is TrendingBill => !!r);
}

// Interest-weighted shuffle: probability of an item ranking high scales with its
// interest score. A bill scored 80 is ~4x more likely to surface than one at 20.
function weightedShuffle<T>(items: T[], weight: (item: T) => number): T[] {
  return [...items]
    .map((item) => {
      // Gumbel trick: ranking by -log(-log(u))/w yields a sample without replacement
      // weighted by w. We just need ranks, so any monotone transform works.
      const w = Math.max(1, weight(item));
      const u = Math.random();
      const r = -Math.log(-Math.log(u + 1e-12) + 1e-12) / w;
      return { item, r };
    })
    .sort((a, b) => b.r - a.r)
    .map(({ item }) => item);
}

export async function loadFeed(
  supabase: SupabaseClient,
  sort: FeedSort,
  userId: string | null,
  limit = 25,
  pool = 80,
): Promise<FeedBill[]> {
  // Always fetch a generous pool ordered by recency so we have data to sort.
  // For "newest" we'll switch to introduced_at after the fetch.
  const { data: bills } = await supabase
    .from('bills')
    .select(
      'id, bill_number, chamber, session_label, title_en, plain_english_summary, interest_score, introduced_at, latest_action_at, latest_action_text, bill_issue_tags(issue_tags(slug, display_en)), sponsorships(role, persons(id, name, party, state_or_province))',
    )
    .not('plain_english_summary', 'is', null)
    .order('latest_action_at', { ascending: false, nullsFirst: false })
    .limit(pool);

  const rows = (bills ?? []) as unknown as (BillListRow & {
    introduced_at: string | null;
    interest_score: number | null;
  })[];

  const interestOf = (id: string): number =>
    rows.find((r) => r.id === id)?.interest_score ?? 50;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const { data: countRows } = await supabase
    .from('bill_signal_counts')
    .select('bill_id, support_count, oppose_count, priority_count, neutral_count')
    .in('bill_id', ids);

  const countsByBill = new Map<string, SignalCounts>();
  for (const r of countRows ?? []) {
    countsByBill.set(r.bill_id as string, {
      support: r.support_count ?? 0,
      oppose: r.oppose_count ?? 0,
      priority: r.priority_count ?? 0,
      neutral: r.neutral_count ?? 0,
    });
  }

  const userSignalsByBill = new Map<string, BillSignal[]>();
  if (userId) {
    const { data: mine } = await supabase
      .from('bill_signals')
      .select('bill_id, signal')
      .eq('user_id', userId)
      .in('bill_id', ids);
    for (const r of mine ?? []) {
      const arr = userSignalsByBill.get(r.bill_id as string) ?? [];
      arr.push(r.signal as BillSignal);
      userSignalsByBill.set(r.bill_id as string, arr);
    }
  }

  // Recent community votes per bill (last ~30 from this pool, then bucketed to top 3 each).
  const { data: recent } = await supabase
    .from('bill_signals')
    .select('bill_id, signal, created_at, profiles(display_name)')
    .in('bill_id', ids)
    .order('created_at', { ascending: false })
    .limit(ids.length * 8);

  const recentByBill = new Map<string, RecentVote[]>();
  for (const r of (recent ?? []) as Array<{
    bill_id: string;
    signal: string;
    created_at: string;
    profiles: { display_name: string | null } | { display_name: string | null }[] | null;
  }>) {
    const arr = recentByBill.get(r.bill_id) ?? [];
    if (arr.length >= 3) continue;
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    arr.push({
      signal: r.signal as BillSignal,
      display_name: prof?.display_name?.trim() || 'A FiveVote user',
      created_at: r.created_at,
    });
    recentByBill.set(r.bill_id, arr);
  }

  let prepared: FeedBill[] = rows.map((r) => {
    const sponsor = billSponsor(r);
    const tags = r.bill_issue_tags
      .map((t) => (Array.isArray(t.issue_tags) ? t.issue_tags[0] : t.issue_tags))
      .filter((t): t is { slug: string; display_en: string } => !!t);
    return {
      id: r.id,
      bill_number: r.bill_number,
      chamber: r.chamber,
      session_label: r.session_label,
      title_en: r.title_en,
      plain_english_summary: r.plain_english_summary,
      sponsor_name: sponsor?.name ?? null,
      issue_labels: tags.map((t) => t.display_en),
      counts: countsByBill.get(r.id) ?? { support: 0, oppose: 0, priority: 0, neutral: 0 },
      userSignals: userSignalsByBill.get(r.id) ?? [],
      recentVotes: recentByBill.get(r.id) ?? [],
    };
  });

  if (sort === 'newest') {
    // Newly introduced first; fall back to latest_action.
    prepared = [...prepared].sort((a, b) => {
      const ai = rows.find((r) => r.id === a.id)?.introduced_at ?? '';
      const bi = rows.find((r) => r.id === b.id)?.introduced_at ?? '';
      return bi.localeCompare(ai);
    });
  } else if (sort === 'supported') {
    prepared = [...prepared].sort((a, b) => b.counts.support - a.counts.support);
  } else if (sort === 'opposed') {
    prepared = [...prepared].sort((a, b) => b.counts.oppose - a.counts.oppose);
  } else if (sort === 'interesting') {
    // Pure interest-score order, ties broken by recency (already the natural order).
    prepared = [...prepared].sort((a, b) => interestOf(b.id) - interestOf(a.id));
  } else {
    // 'recent' default: weighted shuffle — higher interest bills are more likely
    // to surface, but every reload still rotates the deck.
    prepared = weightedShuffle(prepared, (b) => interestOf(b.id));
  }

  // For signed-in users, surface unvoted bills first so each reload gives them
  // fresh material to consider.
  if (userId) {
    const unvoted = prepared.filter((b) => b.userSignals.length === 0);
    const voted = prepared.filter((b) => b.userSignals.length > 0);
    prepared = [...unvoted, ...voted];
  }

  return prepared.slice(0, limit);
}
