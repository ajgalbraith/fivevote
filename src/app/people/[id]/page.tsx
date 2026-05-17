import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Landmark, User, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: person } = await supabase
    .from('persons')
    .select('id, name, party, state_or_province, district, bioguide_id, source_url')
    .eq('id', id)
    .maybeSingle();
  if (!person) notFound();

  const { data: sponsorships } = await supabase
    .from('sponsorships')
    .select('role, added_at, bills(id, bill_number, chamber, session_label, title_en, status_code, latest_action_at, latest_action_text)')
    .eq('person_id', id)
    .eq('role', 'sponsor')
    .order('added_at', { ascending: false, nullsFirst: false })
    .limit(50);

  const bills =
    sponsorships
      ?.map((s) => (Array.isArray(s.bills) ? s.bills[0] : s.bills))
      .filter((b): b is NonNullable<typeof b> => !!b) ?? [];

  const partyLabel = person.party
    ? person.party === 'D'
      ? 'Democrat'
      : person.party === 'R'
        ? 'Republican'
        : person.party === 'I'
          ? 'Independent'
          : person.party
    : null;

  return (
    <div className="space-y-8">
      <Link
        href="/bills"
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2' })}
      >
        <ArrowLeft />
        All bills
      </Link>

      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <User className="size-3" /> Sponsor
          </Badge>
          {partyLabel ? <span>· {partyLabel}</span> : null}
          {person.state_or_province ? <span>· {person.state_or_province}</span> : null}
          {person.district ? <span>· District {person.district}</span> : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{person.name}</h1>
        {person.source_url ? (
          <a
            href={person.source_url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            View biography <ExternalLink />
          </a>
        ) : null}
      </header>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Sponsored bills</h2>
          <span className="text-xs text-muted-foreground">{bills.length} total</span>
        </div>
        {bills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No sponsored bills recorded yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {bills.map((b) => (
              <Link key={b.id} href={`/bills/${b.id}`} className="block">
                <Card className="transition hover:border-foreground/20">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="default" className="gap-1">
                        <Landmark className="size-3" /> Official
                      </Badge>
                      <span className="font-mono font-medium text-foreground">
                        {b.bill_number}
                      </span>
                      {b.chamber ? <span>· {b.chamber}</span> : null}
                      <span>· {b.session_label}</span>
                      {b.status_code ? (
                        <Badge variant="secondary" className="ml-auto font-normal">
                          {b.status_code}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="font-medium leading-snug">{b.title_en ?? '(untitled)'}</div>
                    {b.latest_action_text ? (
                      <div className="line-clamp-2 text-sm text-muted-foreground">
                        Latest: {b.latest_action_text}
                      </div>
                    ) : null}
                    {b.latest_action_at ? (
                      <div className="text-xs text-muted-foreground">
                        {new Date(b.latest_action_at).toLocaleDateString()}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
