import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ProposalsPage() {
  const supabase = await getSupabaseServerClient();

  const { data: proposals, error } = await supabase
    .from('user_proposals')
    .select('id, title, plain_language_summary, status, moderation_state, published_at, jurisdictions(name)')
    .eq('status', 'published')
    .eq('moderation_state', 'approved')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="mb-1 inline-block rounded bg-violet-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
            Community
          </div>
          <h1 className="text-2xl font-semibold">Citizen proposals</h1>
          <p className="text-sm text-neutral-600">
            Ideas authored by FiveVote users. Not official legislation.
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
        >
          New proposal
        </Link>
      </header>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error.message}
        </div>
      ) : !proposals || proposals.length === 0 ? (
        <div className="rounded border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No published proposals yet.{' '}
          <Link href="/proposals/new" className="text-blue-600 hover:underline">
            Be the first to write one.
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {proposals.map((p) => {
            const jName = Array.isArray(p.jurisdictions)
              ? p.jurisdictions[0]?.name
              : (p.jurisdictions as { name?: string } | null)?.name;
            return (
              <li key={p.id} className="p-4 hover:bg-neutral-50">
                <Link href={`/proposals/${p.id}`} className="block space-y-1">
                  <div className="text-xs text-neutral-500">
                    {jName ?? 'unscoped'}
                    {p.published_at ? ` · ${new Date(p.published_at).toLocaleDateString()}` : ''}
                  </div>
                  <div className="font-medium">{p.title}</div>
                  {p.plain_language_summary ? (
                    <div className="text-sm text-neutral-700">
                      {p.plain_language_summary}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
