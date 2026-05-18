#!/usr/bin/env node
// FiveVote — demo seed
// Creates N fake users, casts weighted-random signals on existing bills, and
// inserts a handful of approved community proposals so the app shows realistic data.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N_USERS = Number(process.env.SEED_USERS ?? 30);
const SIGNALS_PER_USER_MIN = Number(process.env.SEED_SIGNALS_MIN ?? 8);
const SIGNALS_PER_USER_MAX = Number(process.env.SEED_SIGNALS_MAX ?? 25);
const US_FEDERAL_JURISDICTION_ID = '11111111-1111-1111-1111-111111111111';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FIRSTS = ['Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Quinn', 'Avery', 'Jamie', 'Drew', 'Skyler', 'Reese', 'Hayden', 'Rowan', 'Parker', 'Elliot', 'Charlie', 'Emerson', 'Finley'];
const LASTS = ['Carter', 'Patel', 'Nguyen', 'Garcia', 'Lopez', 'Brown', 'Smith', 'Khan', 'Cohen', 'Adams', 'Park', 'Wright', 'Hayes', 'Reed', 'Ford', 'Sullivan', 'Booker', 'Chen', 'Doyle', 'Brooks'];

// Signal distribution probabilities (must sum to 1).
const SIGNAL_DIST = [
  { signal: 'support', p: 0.42 },
  { signal: 'oppose', p: 0.28 },
  { signal: 'priority', p: 0.16 },
  { signal: 'neutral', p: 0.14 },
];

function pickSignal() {
  const r = Math.random();
  let acc = 0;
  for (const s of SIGNAL_DIST) {
    acc += s.p;
    if (r < acc) return s.signal;
  }
  return 'support';
}

function pickInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Biased bill picker — log-decay so the first few bills get most signals,
// producing a realistic long-tail distribution for "trending".
function biasedPick(billIds) {
  // Map a uniform 0..1 to an index biased toward 0 via x^3.
  const r = Math.pow(Math.random(), 3);
  const idx = Math.min(billIds.length - 1, Math.floor(r * billIds.length));
  return billIds[idx];
}

async function loadBillIds() {
  const { data, error } = await sb
    .from('bills')
    .select('id, latest_action_at')
    .order('latest_action_at', { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  return data.map((b) => b.id);
}

async function createUser(i) {
  const first = pickFromArray(FIRSTS);
  const last = pickFromArray(LASTS);
  const email = `seed-${i}-${Date.now().toString(36).slice(-5)}@fivevote-demo.invalid`;
  const { data, error } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { display_name: `${first} ${last}` },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return { id: data.user.id, name: `${first} ${last}` };
}

async function seedSignalsForUser(userId, billIds) {
  const n = pickInt(SIGNALS_PER_USER_MIN, SIGNALS_PER_USER_MAX);
  const seen = new Set();
  const rows = [];
  for (let i = 0; i < n; i++) {
    const billId = biasedPick(billIds);
    const signal = pickSignal();
    const key = `${billId}|${signal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Random timestamp within last 14 days for spread.
    const daysAgo = Math.random() * 14;
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    rows.push({ bill_id: billId, user_id: userId, signal, created_at: createdAt });
  }
  if (rows.length === 0) return 0;
  const { error } = await sb.from('bill_signals').insert(rows);
  if (error) {
    // The unique (bill_id, user_id, signal) constraint may collide if the
    // same user/bill/signal already exists. Treat as best-effort.
    console.warn(`  ! some signals collided for user: ${error.message}`);
    return 0;
  }
  return rows.length;
}

const DEMO_PROPOSALS = [
  {
    title: 'National right-to-repair standard for electronics',
    summary: 'Require manufacturers to publish service manuals, parts, and tools for any consumer electronic sold in the U.S.',
    problem: 'Right-to-repair is patchworked state-by-state. Consumers and small repair shops are blocked from fixing devices they own.',
    text: `Section 1. Scope. Applies to consumer electronics sold in the U.S. with a price >= $50.

Section 2. Manufacturer obligations. Within 90 days of release, manufacturers must publish (a) full service documentation, (b) tools, (c) firmware necessary to perform repair, and (d) replacement parts at fair prices, for the lifetime of the product plus 7 years.

Section 3. Enforcement. FTC empowered to assess civil penalties up to $50,000 per violation per day.`,
  },
  {
    title: 'Cap federal student loan interest at the 10-year Treasury rate',
    summary: 'Tie federal student loan interest to the 10-year Treasury rate, eliminating the current statutory floor.',
    problem: 'Federal student loans currently carry rates well above market borrowing costs for the government, costing borrowers billions.',
    text: `Section 1. Federal student loan interest, beginning the following academic year, shall be set at the 10-year Treasury rate measured on June 1 preceding the academic year, plus 0.5% for servicing costs.

Section 2. Existing federal loans may be refinanced at the same rate, one time, by borrower request.

Section 3. No statutory floor on the resulting rate.`,
  },
  {
    title: 'Carbon dividend: tax fossil fuels, rebate evenly to households',
    summary: 'A revenue-neutral upstream fee on carbon, with 100% of revenue returned as quarterly per-capita dividends.',
    problem: 'Carbon pricing without revenue recycling is regressive. A dividend model returns money to households while still pricing emissions.',
    text: `Section 1. Fee. Imposes an upstream fee on fossil fuels at the point of extraction or import, beginning at $40/ton CO2-equivalent and rising $10/ton annually.

Section 2. Dividend. 100% of net revenue rebated quarterly to U.S. residents, equal per-capita. Households of two adults and two children receive 3 shares (children at half-share).

Section 3. Border adjustment. Imports from countries without comparable carbon pricing are assessed an equivalent border fee.`,
  },
  {
    title: 'Federal jury-duty stipend raised to $80/day plus child care reimbursement',
    summary: 'Update the antiquated federal juror per diem and reimburse documented child-care costs.',
    problem: 'The current $50/day federal juror stipend is unchanged since 1990 and excludes lower-income citizens from jury service.',
    text: `Section 1. The federal juror per diem is raised to $80/day, indexed to CPI annually.

Section 2. Reimburses documented child-care costs incurred during jury service up to $200/day.

Section 3. Employers of 25+ employees are prohibited from reducing pay during jury service.`,
  },
  {
    title: 'Plain-language federal regulation requirement',
    summary: 'Require every federal agency regulation to include a one-page plain-English summary written at an 8th-grade reading level.',
    problem: 'Federal regulations are inaccessible to the public. A short plain-English summary already exists informally in many agencies — make it a requirement.',
    text: `Section 1. Within 12 months, every new federal regulation must include a one-page plain-English summary, written at or below an 8th-grade reading level, covering: purpose, who it affects, what changes, and effective date.

Section 2. Existing major rules must be summarized within 5 years.

Section 3. GAO will audit compliance annually.`,
  },
];

async function seedProposals(authorIds) {
  if (authorIds.length === 0) return 0;
  let n = 0;
  for (const p of DEMO_PROPOSALS) {
    const authorId = pickFromArray(authorIds);
    const { error } = await sb.from('user_proposals').insert({
      jurisdiction_id: US_FEDERAL_JURISDICTION_ID,
      author_user_id: authorId,
      title: p.title,
      plain_language_summary: p.summary,
      problem_statement: p.problem,
      proposal_text: p.text,
      status: 'published',
      moderation_state: 'approved',
      published_at: new Date(Date.now() - Math.random() * 7 * 86_400_000).toISOString(),
    });
    if (error) {
      console.warn(`  ! proposal insert failed: ${error.message}`);
    } else {
      n += 1;
      console.log(`  ✓ proposal: ${p.title.slice(0, 60)}`);
    }
  }
  return n;
}

async function seedProposalSignals(proposalAuthorIds) {
  if (proposalAuthorIds.length === 0) return 0;
  const { data: proposals } = await sb
    .from('user_proposals')
    .select('id')
    .eq('moderation_state', 'approved');
  if (!proposals || proposals.length === 0) return 0;

  const { data: profiles } = await sb.from('profiles').select('id').limit(500);
  const userIds = (profiles ?? []).map((p) => p.id);
  if (userIds.length === 0) return 0;

  let n = 0;
  for (const prop of proposals) {
    const voters = userIds
      .sort(() => Math.random() - 0.5)
      .slice(0, pickInt(8, 25));
    const rows = voters.map((uid) => {
      const r = Math.random();
      const signal = r < 0.55 ? 'support' : r < 0.85 ? 'not_now' : 'needs_revision';
      const daysAgo = Math.random() * 7;
      return {
        proposal_id: prop.id,
        user_id: uid,
        signal,
        created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      };
    });
    // upsert because (proposal_id, user_id) is unique
    const { error } = await sb
      .from('proposal_signals')
      .upsert(rows, { onConflict: 'proposal_id,user_id' });
    if (!error) n += rows.length;
  }
  return n;
}

async function main() {
  console.log(`Loading bill pool…`);
  const billIds = await loadBillIds();
  console.log(`Loaded ${billIds.length} bills.`);

  console.log(`Creating ${N_USERS} fake users + signals…`);
  const newUsers = [];
  let totalSignals = 0;
  for (let i = 0; i < N_USERS; i++) {
    try {
      const u = await createUser(i);
      newUsers.push(u);
      const n = await seedSignalsForUser(u.id, billIds);
      totalSignals += n;
      process.stdout.write(`  ✓ ${u.name} (+${n} signals)\n`);
    } catch (err) {
      console.error(`  ✗ user ${i}: ${err.message}`);
    }
  }

  console.log(`Seeding demo proposals…`);
  const nProps = await seedProposals(newUsers.map((u) => u.id));

  console.log(`Seeding proposal signals…`);
  const nPropSignals = await seedProposalSignals(newUsers.map((u) => u.id));

  console.log(`\nDone.`);
  console.log(`  users:           ${newUsers.length}`);
  console.log(`  bill signals:    ${totalSignals}`);
  console.log(`  proposals:       ${nProps}`);
  console.log(`  proposal signals: ${nPropSignals}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
