'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type BillSignal = 'support' | 'oppose' | 'priority';

export async function castBillSignal(billId: string, signal: BillSignal) {
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

  revalidatePath(`/bills/${billId}`);
  return { ok: true };
}
