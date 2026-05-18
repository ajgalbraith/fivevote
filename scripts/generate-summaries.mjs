#!/usr/bin/env node
// FiveVote — AI plain-English summary + interest score
// One-shot: pull bills without a plain_english_summary, generate via Claude Haiku 4.5, write back.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODEL = 'claude-haiku-4-5';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anthropic = new Anthropic();

const SYSTEM = `You write plain-English summaries of U.S. federal bills for a civic-engagement app and rate their civic interest.

OUTPUT — single line of JSON, no prose, no code fence:
{"summary": "<one sentence>", "interest_score": <int 0-100>}

Rules for "summary":
- One sentence, max 30 words. Plain language a non-lawyer can understand.
- Lead with what the bill *would do*. Avoid passive constructions.
- No jargon, no abbreviations, no bill numbers.
- Don't editorialize. Don't predict outcomes. Don't speculate on motivation.
- If you genuinely cannot tell what the bill does from the available data, write: "Procedural or technical bill; not enough public information to summarize."

Rules for "interest_score" (0-100 — civic interest / controversy / public-attention potential):
- 0-15: pure procedural — renaming a building, technical corrections, ceremonial resolutions, congressional housekeeping.
- 16-35: narrow administrative changes affecting small constituencies.
- 36-55: routine policy adjustments most voters would have no opinion on.
- 56-75: substantive policy changes affecting many people — likely to interest informed voters.
- 76-90: divisive or hot-button issues — immigration, abortion, guns, taxes, healthcare, civil rights, AI/tech regulation, climate. Things people argue about online.
- 91-100: landmark legislation — major rewrites of social policy, constitutional amendments, headline-grabbing fights.

Use the full range. Be willing to score below 20 and above 80.`;

async function summarizeOne(bill) {
  const parts = [`Title: ${bill.title_en ?? '(no title)'}`];
  if (bill.summary_en) parts.push(`Official summary: ${bill.summary_en.slice(0, 3000)}`);
  if (bill.latest_action_text) parts.push(`Latest action: ${bill.latest_action_text}`);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: 'user', content: parts.join('\n\n') }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  // The model occasionally wraps in ```json or adds prose. Extract the JSON object.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`no JSON in response: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(match[0]);

  let summary = String(parsed.summary ?? '').trim();
  let score = Number(parsed.interest_score);
  if (!summary) throw new Error('empty summary');
  if (!Number.isFinite(score)) score = 50;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { summary, interest_score: score };
}

async function main() {
  const { data: bills, error } = await sb
    .from('bills')
    .select('id, bill_number, title_en, summary_en, latest_action_text')
    .is('plain_english_summary', null)
    .order('latest_action_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (!bills || bills.length === 0) {
    console.log('Nothing to summarize.');
    return;
  }

  console.log(`Summarizing ${bills.length} bills with ${MODEL}...`);
  let ok = 0;
  let fail = 0;
  const now = new Date().toISOString();

  for (const bill of bills) {
    try {
      const { summary, interest_score } = await summarizeOne(bill);
      const { error: upErr } = await sb
        .from('bills')
        .update({
          plain_english_summary: summary,
          interest_score,
          summary_model: MODEL,
          summary_generated_at: now,
        })
        .eq('id', bill.id);
      if (upErr) throw upErr;
      ok += 1;
      console.log(
        `  ✓ ${bill.bill_number} [${interest_score}] ${summary.slice(0, 70)}${summary.length > 70 ? '…' : ''}`,
      );
    } catch (err) {
      fail += 1;
      console.error(`  ✗ ${bill.bill_number}: ${err.message}`);
    }
  }

  console.log(`Done. ${ok} ok, ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
