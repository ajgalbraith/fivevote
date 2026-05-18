'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type BillSignal = 'support' | 'oppose' | 'priority';

export type SignalCounts = {
  support: number;
  oppose: number;
  priority: number;
};

export type CastBillSignalResult =
  | { ok: true; counts: SignalCounts; userSignals: BillSignal[] }
  | { ok: false; error: string };

export async function castBillSignal(
  billId: string,
  signal: BillSignal,
): Promise<CastBillSignalResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must sign in to vote.' };

  // Toggle: if it exists, remove it; if not, insert it.
  const { data: existing } = await supabase
    .from('bill_signals')
    .select('id')
    .eq('bill_id', billId)
    .eq('user_id', user.id)
    .eq('signal', signal)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('bill_signals').delete().eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('bill_signals').insert({
      bill_id: billId,
      user_id: user.id,
      signal,
    });
    if (error) return { ok: false, error: error.message };
  }

  // Fetch fresh counts + this user's current signal set for the bill.
  const [{ data: countsRow }, { data: mine }] = await Promise.all([
    supabase
      .from('bill_signal_counts')
      .select('support_count, oppose_count, priority_count')
      .eq('bill_id', billId)
      .maybeSingle(),
    supabase
      .from('bill_signals')
      .select('signal')
      .eq('bill_id', billId)
      .eq('user_id', user.id),
  ]);

  const counts: SignalCounts = {
    support: countsRow?.support_count ?? 0,
    oppose: countsRow?.oppose_count ?? 0,
    priority: countsRow?.priority_count ?? 0,
  };
  const userSignals = (mine ?? []).map((r) => r.signal as BillSignal);

  revalidatePath(`/bills/${billId}`);
  return { ok: true, counts, userSignals };
}
