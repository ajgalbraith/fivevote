import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ThumbsUp,
  ThumbsDown,
  Flame,
  Minus,
  Landmark,
  Vote,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { BillSignal } from '@/app/bills/actions';

export const dynamic = 'force-dynamic';

type SignalRow = {
  signal: BillSignal;
  created_at: string;
  bills:
    | { id: string; bill_number: string; chamber: string | null; session_label: string; title_en: string | null; plain_english_summary: string | null }
    | { id: string; bill_number: string; chamber: string | null; session_label: string; title_en: string | null; plain_english_summary: string | null }[]
    | null;
};

const SIGNAL_META: Record<BillSignal, { label: string; Icon: typeof ThumbsUp; color: string }> = {
  support: { label: 'Support', Icon: ThumbsUp, color: 'text-emerald-700' },
  oppose: { label: 'Oppose', Icon: ThumbsDown, color: 'text-rose-700' },
  priority: { label: 'High priority', Icon: Flame, color: 'text-amber-700' },
  neutral: { label: 'Neutral', Icon: Minus, color: 'text-neutral-700' },
};

const ORDER: BillSignal[] = ['support', 'oppose', 'priority', 'neutral'];

export default async function MyVotesPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/votes');

  const { data, error } = await supabase
    .from('bill_signals')
    .select(
      'signal, created_at, bills(id, bill_number, chamber, session_label, title_en, plain_english_summary)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as SignalRow[];

  // Group by signal.
  const grouped = new Map<BillSignal, SignalRow[]>();
  for (const s of ORDER) grouped.set(s, []);
  for (const r of rows) grouped.get(r.signal)?.push(r);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Vote className="size-5 text-muted-foreground" />
          <h1 className="text-3xl font-semibold tracking-tight">Your votes</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Every advisory signal you&apos;ve cast on official bills. Click any to revisit or change.
        </p>
        {error ? (
          <p className="text-xs text-rose-700">{error.message}</p>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((s) => {
          const meta = SIGNAL_META[s];
          const n = grouped.get(s)?.length ?? 0;
          return (
            <Card key={s}>
              <CardContent className="p-4">
                <div className={`mb-1 inline-flex items-center gap-1.5 text-xs font-medium ${meta.color}`}>
                  <meta.Icon className="size-4" />
                  {meta.label}
                </div>
                <div className="font-mono text-2xl font-semibold tabular-nums">{n}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <Vote className="mx-auto size-8 text-muted-foreground/60" />
            <div className="text-sm text-muted-foreground">
              You haven&apos;t cast any signals yet.
            </div>
            <Link href="/" className={buttonVariants({ size: 'sm' })}>
              Start voting
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {ORDER.map((s) => {
        const items = grouped.get(s) ?? [];
        if (items.length === 0) return null;
        const meta = SIGNAL_META[s];
        return (
          <section key={s} className="space-y-3">
            <div className="flex items-center gap-2">
              <meta.Icon className={`size-4 ${meta.color}`} />
              <h2 className="text-base font-semibold">{meta.label}</h2>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="grid gap-3">
              {items.map((row, idx) => {
                const bill = Array.isArray(row.bills) ? row.bills[0] : row.bills;
                if (!bill) return null;
                return (
                  <Link key={`${bill.id}-${idx}`} href={`/bills/${bill.id}`} className="block">
                    <Card className="transition hover:border-foreground/20">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="default" className="gap-1">
                            <Landmark className="size-3" /> Official
                          </Badge>
                          <span className="font-mono font-medium text-foreground">
                            {bill.bill_number}
                          </span>
                          {bill.chamber ? <span>· {bill.chamber}</span> : null}
                          <span>· {bill.session_label}</span>
                          <span className="ml-auto">
                            Voted {new Date(row.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-base font-medium leading-snug">
                          {bill.plain_english_summary ?? bill.title_en ?? '(untitled)'}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            <Separator />
          </section>
        );
      })}
    </div>
  );
}
