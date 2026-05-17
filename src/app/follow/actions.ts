'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type FollowTargetKind = 'bill' | 'proposal' | 'issue' | 'jurisdiction';

export async function toggleFollow(targetKind: FollowTargetKind, targetId: string, revalidate?: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must sign in to follow.' };

  const { data: existing } = await supabase
    .from('notification_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_kind', targetKind)
    .eq('target_id', targetId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
    if (revalidate) revalidatePath(revalidate);
    return { ok: true, following: false };
  }

  const { error } = await supabase
    .from('notification_subscriptions')
    .insert({
      user_id: user.id,
      target_kind: targetKind,
      target_id: targetId,
    });
  if (error) return { ok: false, error: error.message };
  if (revalidate) revalidatePath(revalidate);
  return { ok: true, following: true };
}
