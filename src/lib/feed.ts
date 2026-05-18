import type { SupabaseClient } from '@supabase/supabase-js';

import { billSponsor, type BillListRow } from '@/lib/bills/query';
import type { FeedBill } from '@/components/VoteFeed';
import type { BillSignal, SignalCounts } from '@/app/bills/actions';

export type FeedSort = 'recent' | 'newest' | 'supported' | 'opposed';

export const FEED_SORTS: { value: FeedSort; label: string }[] = [
  { value: 'recent', label: 'Recent activity' },
  { value: 'newest', label: 'Newest' },
  { value: 'supported', label: 'Most supported' },
  { value: 'opposed', label: 'Most opposed' },
];

export function parseSort(s: string | null | undefined): FeedSort {
  if (s === 'newest' || s === 'supported' || s === 'opposed' || s === 'recent') return s;
  return 'recent';
}

export async function loadFeed(
  supabase: SupabaseClient,
  sort: FeedSort,
  userId: string | null,
  limit = 20,
  pool = 60,
): Promise<FeedBill[]> {
  // Always fetch a generous pool ordered by recency so we have data to sort.
  // For "newest" we'll switch to introduced_at after the fetch.
  const { data: bills } = await supabase
    .from('bills')
    .select(
      'id, bill_number, chamber, session_label, title_en, plain_english_summary, introduced_at, latest_action_at, latest_action_text, bill_issue_tags(issue_tags(slug, display_en)), sponsorships(role, persons(id, name, party, state_or_province))',
    )
    .not('plain_english_summary', 'is', null)
    .order('latest_action_at', { ascending: false, nullsFirst: false })
    .limit(pool);

  const rows = (bills ?? []) as unknown as (BillListRow & {
    introduced_at: string | null;
  })[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const { data: countRows } = await supabase
    .from('bill_signal_counts')
    .select('bill_id, support_count, oppose_count, priority_count')
    .in('bill_id', ids);

  const countsByBill = new Map<string, SignalCounts>();
  for (const r of countRows ?? []) {
    countsByBill.set(r.bill_id as string, {
      support: r.support_count ?? 0,
      oppose: r.oppose_count ?? 0,
      priority: r.priority_count ?? 0,
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
      counts: countsByBill.get(r.id) ?? { support: 0, oppose: 0, priority: 0 },
      userSignals: userSignalsByBill.get(r.id) ?? [],
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
  }
  // 'recent' is already the natural order.

  return prepared.slice(0, limit);
}
