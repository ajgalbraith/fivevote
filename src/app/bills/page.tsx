import Link from 'next/link';
import { Landmark, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
      <header className="space-y-2">
        <Badge variant="default" className="gap-1">
          <Landmark className="size-3" /> Official
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Government bills</h1>
        <p className="text-sm text-muted-foreground">
          Pulled from official sources. Provenance preserved per bill.
        </p>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load bills</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : !bills || bills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <FileText className="size-8 text-muted-foreground/60" />
            <div>No bills ingested yet.</div>
            <div className="text-xs">
              Run the Congress.gov connector to populate the database.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bills.map((b) => (
            <Link key={b.id} href={`/bills/${b.id}`} className="block">
              <Card className="transition hover:border-foreground/20">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono font-medium text-foreground">
                      {b.bill_number}
                    </span>
                    {b.chamber ? <span>· {b.chamber}</span> : null}
                    <span>· {b.session_label}</span>
                    {b.status_code ? (
                      <Badge variant="outline" className="ml-auto">
                        {b.status_code}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="font-medium leading-snug">
                    {b.title_en ?? '(untitled)'}
                  </div>
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
    </div>
  );
}
