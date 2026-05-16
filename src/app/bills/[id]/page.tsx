import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import BillSignalButtons from '@/components/BillSignalButtons';

export const dynamic = 'force-dynamic';

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: bill } = await supabase
    .from('bills')
    .select(
      'id, bill_number, chamber, session_label, title_en, summary_en, status_code, introduced_at, latest_action_at, latest_action_text, source_url, source_system, jurisdiction_id, jurisdictions(name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!bill) notFound();

  const [{ data: actions }, { data: counts }, { data: { user } }] = await Promise.all([
    supabase
      .from('bill_actions')
      .select('id, occurred_at, chamber, action_text')
      .eq('bill_id', id)
      .order('occurred_at', { ascending: false })
      .limit(20),
    supabase
      .from('bill_signal_counts')
      .select('support_count, oppose_count, priority_count')
      .eq('bill_id', id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const userSignals = user
    ? (
        await supabase
          .from('bill_signals')
          .select('signal')
          .eq('bill_id', id)
          .eq('user_id', user.id)
      ).data?.map((r) => r.signal as 'support' | 'oppose' | 'priority') ?? []
    : [];

  const jurisdictionName = Array.isArray(bill.jurisdictions)
    ? bill.jurisdictions[0]?.name
    : (bill.jurisdictions as { name?: string } | null)?.name;

  return (
    <div className="space-y-8">
      <nav className="text-sm">
        <Link href="/bills" className="text-blue-600 hover:underline">
          ← All bills
        </Link>
      </nav>

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-blue-600 px-2 py-0.5 font-semibold uppercase tracking-wide text-white">
            Official
          </span>
          <span className="font-mono text-neutral-600">{bill.bill_number}</span>
          {bill.chamber ? <span className="text-neutral-500">· {bill.chamber}</span> : null}
          <span className="text-neutral-500">· {bill.session_label}</span>
          {jurisdictionName ? <span className="text-neutral-500">· {jurisdictionName}</span> : null}
        </div>
        <h1 className="text-2xl font-semibold leading-tight">
          {bill.title_en ?? '(untitled)'}
        </h1>
        {bill.status_code ? (
          <p className="text-sm text-neutral-600">Status: {bill.status_code}</p>
        ) : null}
        {bill.source_url ? (
          <p className="text-sm">
            <a
              href={bill.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              View source on {bill.source_system} ↗
            </a>
          </p>
        ) : null}
      </header>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Advisory signal only.</strong> Your input is community feedback, not a
        legislative vote. Lawmaking happens through Congress, not through FiveVote.
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Community signal</h2>
        <BillSignalButtons
          billId={bill.id}
          isSignedIn={!!user}
          counts={counts ?? { support_count: 0, oppose_count: 0, priority_count: 0 }}
          userSignals={userSignals}
        />
      </section>

      {bill.summary_en ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Summary</h2>
          <p className="whitespace-pre-line text-sm text-neutral-800">{bill.summary_en}</p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent actions</h2>
        {actions && actions.length > 0 ? (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white text-sm">
            {actions.map((a) => (
              <li key={a.id} className="p-3">
                <div className="text-xs text-neutral-500">
                  {new Date(a.occurred_at).toLocaleString()}
                  {a.chamber ? ` · ${a.chamber}` : ''}
                </div>
                <div>{a.action_text}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">No actions recorded yet.</p>
        )}
      </section>
    </div>
  );
}
