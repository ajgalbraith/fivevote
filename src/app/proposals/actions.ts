'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type ProposalSignal = 'support' | 'not_now' | 'needs_revision';

export type CreateProposalState = { ok: boolean; error?: string };

export async function createProposal(
  _prev: CreateProposalState,
  formData: FormData,
): Promise<CreateProposalState> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must sign in to create a proposal.' };

  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const problem = String(formData.get('problem') ?? '').trim();
  const proposalText = String(formData.get('proposal_text') ?? '').trim();
  const jurisdictionId = String(formData.get('jurisdiction_id') ?? '').trim();

  if (!title || !proposalText || !jurisdictionId) {
    return { ok: false, error: 'Title, jurisdiction, and proposal text are required.' };
  }
  if (title.length > 200) return { ok: false, error: 'Title is too long.' };
  if (proposalText.length > 10_000) return { ok: false, error: 'Proposal text is too long.' };

  const { data, error } = await supabase
    .from('user_proposals')
    .insert({
      author_user_id: user.id,
      jurisdiction_id: jurisdictionId,
      title,
      plain_language_summary: summary || null,
      problem_statement: problem || null,
      proposal_text: proposalText,
      status: 'published',
      moderation_state: 'pending',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath('/proposals');
  redirect(`/proposals/${data.id}`);
}

export async function castProposalSignal(proposalId: string, signal: ProposalSignal) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must sign in to vote.' };

  // One row per (proposal, user). Upsert by selecting then update/insert.
  const { data: existing } = await supabase
    .from('proposal_signals')
    .select('id, signal')
    .eq('proposal_id', proposalId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing && existing.signal === signal) {
    const { error } = await supabase.from('proposal_signals').delete().eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
  } else if (existing) {
    const { error } = await supabase
      .from('proposal_signals')
      .update({ signal })
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('proposal_signals').insert({
      proposal_id: proposalId,
      user_id: user.id,
      signal,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/proposals/${proposalId}`);
  return { ok: true };
}
