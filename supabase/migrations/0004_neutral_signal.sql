-- Add 'neutral' as a fourth signal on official bills.

alter table bill_signals drop constraint if exists bill_signals_signal_check;
alter table bill_signals
  add constraint bill_signals_signal_check
  check (signal in ('support','oppose','priority','neutral'));

drop view if exists bill_signal_counts;
create view bill_signal_counts as
select
  bill_id,
  count(*) filter (where signal = 'support')  as support_count,
  count(*) filter (where signal = 'oppose')   as oppose_count,
  count(*) filter (where signal = 'priority') as priority_count,
  count(*) filter (where signal = 'neutral')  as neutral_count
from bill_signals
group by bill_id;
