import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import NewProposalForm from '@/components/NewProposalForm';

export const dynamic = 'force-dynamic';

export default async function NewProposalPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/proposals/new');

  const { data: jurisdictions } = await supabase
    .from('jurisdictions')
    .select('id, name, country_code, level')
    .order('country_code')
    .order('level');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <div className="mb-1 inline-block rounded bg-violet-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          Community
        </div>
        <h1 className="text-2xl font-semibold">New proposal</h1>
        <p className="text-sm text-neutral-600">
          Your proposal will be labeled as a <strong>community idea</strong> and reviewed
          before becoming widely visible. It is not legislation.
        </p>
      </header>

      <NewProposalForm jurisdictions={jurisdictions ?? []} />
    </div>
  );
}
