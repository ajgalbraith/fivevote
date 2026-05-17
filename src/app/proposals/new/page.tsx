import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <header className="space-y-2">
        <Badge variant="secondary" className="gap-1">
          <Users className="size-3" /> Community
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">New proposal</h1>
        <p className="text-sm text-muted-foreground">
          Your proposal will be labeled as a <span className="font-medium text-foreground">community idea</span>{' '}
          and reviewed before becoming widely visible. It is not legislation.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Write your proposal</CardTitle>
          <CardDescription>
            Be specific and plain-spoken. You can edit while it&apos;s in draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProposalForm jurisdictions={jurisdictions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
