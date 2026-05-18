-- AI-generated interest score 0..100. Higher = more civic interest / controversy.
-- Used to weight the curated feed so "people-actually-care" bills surface first.

alter table bills add column if not exists interest_score int;
alter table bills add constraint bills_interest_score_range
  check (interest_score is null or (interest_score >= 0 and interest_score <= 100));

create index if not exists bills_interest_score_idx on bills (interest_score desc nulls last);
