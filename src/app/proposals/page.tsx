import Link from 'next/link';
import { Users, MessageSquarePlus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="size-3" /> Community
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Citizen proposals</h1>
          <p className="text-sm text-muted-foreground">
            Ideas authored by FiveVote users. Not official legislation.
          </p>
        </div>
        <Link href="/proposals/new" className={buttonVariants({ size: 'sm' })}>
          <MessageSquarePlus />
          New proposal
        </Link>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load proposals</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : !proposals || proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MessageSquarePlus className="size-8 text-muted-foreground/60" />
            <div className="text-sm text-muted-foreground">No published proposals yet.</div>
            <Link href="/proposals/new" className={buttonVariants({ size: 'sm' })}>
              Be the first
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {proposals.map((p) => {
            const jName = Array.isArray(p.jurisdictions)
              ? p.jurisdictions[0]?.name
              : (p.jurisdictions as { name?: string } | null)?.name;
            return (
              <Link key={p.id} href={`/proposals/${p.id}`} className="block">
                <Card className="transition hover:border-foreground/20">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{jName ?? 'unscoped'}</span>
                      {p.published_at ? (
                        <span>· {new Date(p.published_at).toLocaleDateString()}</span>
                      ) : null}
                    </div>
                    <div className="font-medium leading-snug">{p.title}</div>
                    {p.plain_language_summary ? (
                      <div className="line-clamp-2 text-sm text-muted-foreground">
                        {p.plain_language_summary}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
