-- Plain-English summary, generated separately from the official source.
-- We keep summary_en (sparse, from Congress.gov) and add an AI-generated column.

alter table bills add column if not exists plain_english_summary text;
alter table bills add column if not exists summary_model text;
alter table bills add column if not exists summary_generated_at timestamptz;
