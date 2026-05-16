-- FiveVote canonical schema
-- Hard separation: `bills` (official, source-of-truth) vs `user_proposals` (community).

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Reference & jurisdiction
-- ---------------------------------------------------------------------------

create table jurisdictions (
  id                    uuid primary key default gen_random_uuid(),
  country_code          text not null check (country_code in ('US','CA')),
  level                 text not null check (level in ('federal','state','province','municipal')),
  name                  text not null,
  parent_jurisdiction_id uuid references jurisdictions(id),
  ocd_division_id       text unique,
  timezone              text,
  languages             text[] not null default array['en'],
  official_site_url     text,
  source_strategy       text,
  license_code          text,
  created_at            timestamptz not null default now()
);

create index jurisdictions_country_level_idx on jurisdictions (country_code, level);

create table issue_tags (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  display_en      text not null,
  display_fr      text,
  parent_tag_id   uuid references issue_tags(id),
  source_vocab    text,
  confidence_score numeric
);

-- ---------------------------------------------------------------------------
-- Provenance
-- ---------------------------------------------------------------------------

create table source_artifacts (
  id              uuid primary key default gen_random_uuid(),
  source_system   text not null,
  source_id       text not null,
  fetch_url       text not null,
  fetched_at      timestamptz not null default now(),
  content_type    text,
  content_hash    text,
  parse_status    text not null default 'pending',
  parse_error     text,
  license_code    text,
  payload         jsonb,
  unique (source_system, source_id, content_hash)
);

create index source_artifacts_system_idx on source_artifacts (source_system, fetched_at desc);

-- ---------------------------------------------------------------------------
-- Official legislative items
-- ---------------------------------------------------------------------------

create table bills (
  id                uuid primary key default gen_random_uuid(),
  jurisdiction_id   uuid not null references jurisdictions(id),
  session_label     text not null,
  chamber           text,
  bill_number       text not null,
  bill_type         text,
  source_system     text not null,
  source_id         text not null,
  title_en          text,
  title_fr          text,
  summary_en        text,
  summary_fr        text,
  status_code       text,
  introduced_at     timestamptz,
  latest_action_at  timestamptz,
  latest_action_text text,
  source_url        text,
  is_official       boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (source_system, source_id),
  unique (jurisdiction_id, session_label, chamber, bill_number)
);

create index bills_jurisdiction_status_idx on bills (jurisdiction_id, status_code);
create index bills_latest_action_idx on bills (latest_action_at desc);
create index bills_title_trgm_idx on bills using gin (title_en gin_trgm_ops);

create table bill_versions (
  id                   uuid primary key default gen_random_uuid(),
  bill_id              uuid not null references bills(id) on delete cascade,
  version_label        text not null,
  language             text not null default 'en',
  published_at         timestamptz,
  text_uri             text,
  text_hash            text,
  source_artifact_id   uuid references source_artifacts(id),
  diff_from_version_id uuid references bill_versions(id),
  is_current           boolean not null default false,
  unique (bill_id, version_label, language)
);

create table bill_actions (
  id              uuid primary key default gen_random_uuid(),
  bill_id         uuid not null references bills(id) on delete cascade,
  occurred_at     timestamptz not null,
  chamber         text,
  action_code     text,
  action_text     text not null,
  source_artifact_id uuid references source_artifacts(id)
);

create index bill_actions_bill_idx on bill_actions (bill_id, occurred_at desc);

create table persons (
  id              uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid references jurisdictions(id),
  bioguide_id     text,
  name            text not null,
  party           text,
  state_or_province text,
  district        text,
  source_url      text,
  unique (jurisdiction_id, bioguide_id)
);

create table sponsorships (
  id          uuid primary key default gen_random_uuid(),
  bill_id     uuid not null references bills(id) on delete cascade,
  person_id   uuid not null references persons(id),
  role        text not null default 'cosponsor',
  added_at    timestamptz,
  unique (bill_id, person_id, role)
);

create table vote_records (
  id              uuid primary key default gen_random_uuid(),
  bill_id         uuid not null references bills(id) on delete cascade,
  body_name       text,
  vote_type       text,
  stage_label     text,
  occurred_at     timestamptz,
  result_code     text,
  yes_count       int,
  no_count        int,
  abstain_count   int,
  absent_count    int,
  rollcall        jsonb
);

create table bill_issue_tags (
  bill_id     uuid not null references bills(id) on delete cascade,
  issue_tag_id uuid not null references issue_tags(id) on delete cascade,
  primary key (bill_id, issue_tag_id)
);

-- ---------------------------------------------------------------------------
-- Users (profiles) — augments auth.users
-- ---------------------------------------------------------------------------

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  jurisdiction_id uuid references jurisdictions(id),
  trust_level     int not null default 0,
  is_moderator    boolean not null default false,
  is_banned       boolean not null default false,
  created_at      timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Community: proposals, signals, comments, moderation
-- ---------------------------------------------------------------------------

create table user_proposals (
  id                     uuid primary key default gen_random_uuid(),
  jurisdiction_id        uuid not null references jurisdictions(id),
  author_user_id         uuid not null references profiles(id) on delete cascade,
  title                  text not null,
  problem_statement      text,
  proposal_text          text not null,
  plain_language_summary text,
  status                 text not null default 'draft'
    check (status in ('draft','published','archived')),
  moderation_state       text not null default 'pending'
    check (moderation_state in ('pending','approved','rejected','removed')),
  is_advisory            boolean not null default true,
  created_at             timestamptz not null default now(),
  published_at           timestamptz,
  updated_at             timestamptz not null default now()
);

create index user_proposals_jurisdiction_idx on user_proposals (jurisdiction_id);
create index user_proposals_author_idx on user_proposals (author_user_id);
create index user_proposals_moderation_idx on user_proposals (moderation_state, status);

create table proposal_issue_tags (
  proposal_id uuid not null references user_proposals(id) on delete cascade,
  issue_tag_id uuid not null references issue_tags(id) on delete cascade,
  primary key (proposal_id, issue_tag_id)
);

-- Advisory signals. One row per (user, target).
create table bill_signals (
  id          uuid primary key default gen_random_uuid(),
  bill_id     uuid not null references bills(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  signal      text not null check (signal in ('support','oppose','priority')),
  created_at  timestamptz not null default now(),
  unique (bill_id, user_id, signal)
);

create index bill_signals_bill_idx on bill_signals (bill_id);

create table proposal_signals (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references user_proposals(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  signal      text not null check (signal in ('support','not_now','needs_revision')),
  created_at  timestamptz not null default now(),
  unique (proposal_id, user_id)
);

create index proposal_signals_proposal_idx on proposal_signals (proposal_id);

create table comments (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid references user_proposals(id) on delete cascade,
  bill_id         uuid references bills(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  author_user_id  uuid not null references profiles(id) on delete cascade,
  body            text not null,
  moderation_state text not null default 'pending'
    check (moderation_state in ('pending','approved','rejected','removed')),
  created_at      timestamptz not null default now(),
  check ((proposal_id is not null) or (bill_id is not null))
);

create index comments_proposal_idx on comments (proposal_id) where proposal_id is not null;
create index comments_bill_idx on comments (bill_id) where bill_id is not null;

create table moderation_events (
  id              uuid primary key default gen_random_uuid(),
  moderator_id    uuid references profiles(id),
  target_kind     text not null check (target_kind in ('proposal','comment')),
  target_id       uuid not null,
  prior_state     text,
  new_state       text not null,
  reason          text,
  created_at      timestamptz not null default now()
);

create table abuse_reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references profiles(id),
  target_kind     text not null check (target_kind in ('proposal','comment','user')),
  target_id       uuid not null,
  reason          text not null,
  status          text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at      timestamptz not null default now()
);

create table notification_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  target_kind     text not null check (target_kind in ('bill','proposal','jurisdiction','issue')),
  target_id       uuid not null,
  created_at      timestamptz not null default now(),
  unique (user_id, target_kind, target_id)
);

-- ---------------------------------------------------------------------------
-- Aggregate views for product UX
-- ---------------------------------------------------------------------------

create view bill_signal_counts as
select
  bill_id,
  count(*) filter (where signal = 'support')   as support_count,
  count(*) filter (where signal = 'oppose')    as oppose_count,
  count(*) filter (where signal = 'priority')  as priority_count
from bill_signals
group by bill_id;

create view proposal_signal_counts as
select
  proposal_id,
  count(*) filter (where signal = 'support')          as support_count,
  count(*) filter (where signal = 'not_now')          as not_now_count,
  count(*) filter (where signal = 'needs_revision')   as needs_revision_count
from proposal_signals
group by proposal_id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table jurisdictions          enable row level security;
alter table issue_tags             enable row level security;
alter table bills                  enable row level security;
alter table bill_versions          enable row level security;
alter table bill_actions           enable row level security;
alter table persons                enable row level security;
alter table sponsorships           enable row level security;
alter table vote_records           enable row level security;
alter table bill_issue_tags        enable row level security;
alter table profiles               enable row level security;
alter table user_proposals         enable row level security;
alter table proposal_issue_tags    enable row level security;
alter table bill_signals           enable row level security;
alter table proposal_signals       enable row level security;
alter table comments               enable row level security;
alter table moderation_events      enable row level security;
alter table abuse_reports          enable row level security;
alter table notification_subscriptions enable row level security;
alter table source_artifacts       enable row level security;

-- Public-read for reference + official data
create policy "public read"  on jurisdictions       for select using (true);
create policy "public read"  on issue_tags          for select using (true);
create policy "public read"  on bills               for select using (true);
create policy "public read"  on bill_versions       for select using (true);
create policy "public read"  on bill_actions        for select using (true);
create policy "public read"  on persons             for select using (true);
create policy "public read"  on sponsorships        for select using (true);
create policy "public read"  on vote_records        for select using (true);
create policy "public read"  on bill_issue_tags     for select using (true);
create policy "public read"  on proposal_issue_tags for select using (true);

-- source_artifacts: not publicly readable (raw payloads may include rate-limited content).
-- Writes for all official tables happen via service role only (RLS bypassed).

-- profiles: readable by all (display only), updatable by self
create policy "profiles read" on profiles for select using (true);
create policy "profiles upsert self" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- user_proposals: published+approved are public; authors always see their own;
-- moderators see everything.
create policy "proposals public read"
  on user_proposals for select
  using (
    (status = 'published' and moderation_state = 'approved')
    or author_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator)
  );

create policy "proposals insert self"
  on user_proposals for insert
  with check (auth.uid() = author_user_id);

create policy "proposals update self draft"
  on user_proposals for update
  using (auth.uid() = author_user_id and status = 'draft')
  with check (auth.uid() = author_user_id);

create policy "proposals moderator update"
  on user_proposals for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator));

-- bill_signals: read all; insert as self; delete own
create policy "bill_signals read"   on bill_signals for select using (true);
create policy "bill_signals insert self" on bill_signals for insert with check (auth.uid() = user_id);
create policy "bill_signals delete self" on bill_signals for delete using (auth.uid() = user_id);

-- proposal_signals: read all; upsert as self
create policy "proposal_signals read" on proposal_signals for select using (true);
create policy "proposal_signals insert self" on proposal_signals for insert with check (auth.uid() = user_id);
create policy "proposal_signals update self" on proposal_signals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "proposal_signals delete self" on proposal_signals for delete using (auth.uid() = user_id);

-- comments: approved are public; authors see their own; moderators see all
create policy "comments read"
  on comments for select
  using (
    moderation_state = 'approved'
    or author_user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator)
  );

create policy "comments insert self"
  on comments for insert
  with check (auth.uid() = author_user_id);

create policy "comments moderator update"
  on comments for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator));

-- abuse_reports: insert by any authed user; only moderators read
create policy "reports insert" on abuse_reports for insert with check (auth.uid() = reporter_user_id);
create policy "reports moderator read" on abuse_reports for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator)
);

-- moderation_events: moderators only
create policy "mod events moderator read" on moderation_events for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator)
);

-- notification_subscriptions: self only
create policy "subs self all" on notification_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
