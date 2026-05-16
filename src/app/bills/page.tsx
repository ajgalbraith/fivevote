import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function BillsPage() {
  const supabase = await getSupabaseServerClient();

  const { data: bills, error } = await supabase
    .from('bills')
    .select(
      'id, bill_number, chamber, session_label, title_en, status_code, latest_action_at, latest_action_text, source_url',
    )
    .order('latest_action_at', { ascending: false, nullsFirst: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="mb-1 inline-block rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
            Official
          </div>
          <h1 className="text-2xl font-semibold">Government bills</h1>
          <p className="text-sm text-neutral-600">
            Pulled from official sources. Provenance preserved per bill.
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load bills: {error.message}
        </div>
      ) : !bills || bills.length === 0 ? (
        <div className="rounded border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No bills ingested yet. Run the Congress.gov connector to populate.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {bills.map((b) => (
            <li key={b.id} className="p-4 hover:bg-neutral-50">
              <Link href={`/bills/${b.id}`} className="block">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="font-mono">{b.bill_number}</span>
                      {b.chamber ? <span>· {b.chamber}</span> : null}
                      <span>· {b.session_label}</span>
                      {b.status_code ? <span>· {b.status_code}</span> : null}
                    </div>
                    <div className="font-medium">{b.title_en ?? '(untitled)'}</div>
                    {b.latest_action_text ? (
                      <div className="text-sm text-neutral-600">
                        Latest: {b.latest_action_text}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-xs text-neutral-500">
                    {b.latest_action_at
                      ? new Date(b.latest_action_at).toLocaleDateString()
                      : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
