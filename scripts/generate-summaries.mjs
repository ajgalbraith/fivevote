#!/usr/bin/env node
// FiveVote — AI plain-English summary generator
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

const SYSTEM = `You write plain-English summaries of U.S. federal bills for a civic-engagement app.

Rules:
- One sentence, max 30 words.
- Plain language a non-lawyer can understand. No jargon, no abbreviations, no bill numbers.
- Lead with what the bill *would do*. Avoid passive constructions.
- Don't editorialize. Don't predict outcomes. Don't speculate on motivation.
- If the title is too vague to summarize meaningfully, write: "Procedural or technical bill; not enough public information to summarize."`;

async function summarizeOne(bill) {
  const parts = [`Title: ${bill.title_en ?? '(no title)'}`];
  if (bill.summary_en) parts.push(`Official summary: ${bill.summary_en.slice(0, 2000)}`);
  if (bill.latest_action_text) parts.push(`Latest action: ${bill.latest_action_text}`);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: 'user', content: parts.join('\n\n') }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  return text;
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
      const summary = await summarizeOne(bill);
      const { error: upErr } = await sb
        .from('bills')
        .update({
          plain_english_summary: summary,
          summary_model: MODEL,
          summary_generated_at: now,
        })
        .eq('id', bill.id);
      if (upErr) throw upErr;
      ok += 1;
      console.log(`  ✓ ${bill.bill_number}: ${summary.slice(0, 80)}${summary.length > 80 ? '…' : ''}`);
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
