import Link from 'next/link';
import { Flame, Landmark, ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { TrendingBill } from '@/lib/feed';

function totalNet(b: TrendingBill) {
  return b.counts.support - b.counts.oppose;
}

export default function HotIssuesList({ bills }: { bills: TrendingBill[] }) {
  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 py-12 text-center">
          <Flame className="mx-auto size-8 text-muted-foreground/60" />
          <div className="text-sm text-muted-foreground">
            No hot issues yet — be the first to cast a signal.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {bills.map((bill, i) => {
        const total = bill.total;
        const supportPct = total > 0 ? Math.round((bill.counts.support / total) * 100) : 0;
        const opposePct = total > 0 ? Math.round((bill.counts.oppose / total) * 100) : 0;
        const net = totalNet(bill);
        return (
          <Link key={bill.id} href={`/bills/${bill.id}`} className="block">
            <Card className="transition hover:border-foreground/20">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                    #{i + 1}
                  </span>
                  <Badge variant="default" className="gap-1">
                    <Landmark className="size-3" /> Official
                  </Badge>
                  <span className="font-mono font-medium text-foreground">{bill.bill_number}</span>
                  <span className="ml-auto inline-flex items-center gap-1">
                    <Flame className="size-3 text-amber-600" />
                    <span className="font-mono tabular-nums text-foreground">{total}</span>
                    <span>signals</span>
                  </span>
                </div>
                <div className="font-medium leading-snug">{bill.title_en ?? '(untitled)'}</div>
                {bill.plain_english_summary ? (
                  <div className="line-clamp-2 text-sm text-foreground/80">
                    {bill.plain_english_summary}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-full bg-emerald-600" />
                    <span className="font-mono tabular-nums text-foreground">{supportPct}%</span>
                    <span className="text-muted-foreground">support</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-2 rounded-full bg-rose-600" />
                    <span className="font-mono tabular-nums text-foreground">{opposePct}%</span>
                    <span className="text-muted-foreground">oppose</span>
                  </span>
                  <span className="text-muted-foreground">
                    · net{' '}
                    <span
                      className={
                        net > 0
                          ? 'text-emerald-700 font-medium'
                          : net < 0
                            ? 'text-rose-700 font-medium'
                            : 'text-muted-foreground'
                      }
                    >
                      {net > 0 ? `+${net}` : net}
                    </span>
                  </span>
                  {bill.sponsor_name ? (
                    <span className="ml-auto text-muted-foreground">
                      Sponsored by{' '}
                      <span className="font-medium text-foreground">{bill.sponsor_name}</span>
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-end pt-1 text-xs text-muted-foreground">
                  Open details <ArrowRight className="ml-1 size-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
