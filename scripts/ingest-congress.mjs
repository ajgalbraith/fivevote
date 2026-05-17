#!/usr/bin/env node
// FiveVote — Congress.gov ingestion connector
// Pulls recent bills, writes raw payloads to source_artifacts, upserts bills + actions.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CONGRESS_API_KEY
// Optional: CONGRESS_LIMIT (default 50), CONGRESS_NUMBER (e.g. 119)
//
// Get a free key at https://api.congress.gov/sign-up.

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.CONGRESS_API_KEY;
const LIMIT = Number(process.env.CONGRESS_LIMIT ?? 50);
const CONGRESS = process.env.CONGRESS_NUMBER ?? '119';
const US_FEDERAL_JURISDICTION_ID = '11111111-1111-1111-1111-111111111111';
const SOURCE_SYSTEM = 'congress_gov';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!API_KEY) {
  console.error('Missing CONGRESS_API_KEY (get one at https://api.congress.gov/sign-up)');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sha = (s) => createHash('sha256').update(s).digest('hex');

// Map Congress.gov CRS policy area name → our issue_tags slug.
// Subset of https://www.congress.gov/help/policy-area-terms.
const POLICY_AREA_TO_SLUG = {
  'Health': 'health',
  'Education': 'education',
  'Crime and Law Enforcement': 'justice',
  'Civil Rights and Liberties, Minority Issues': 'civil-rights',
  'Environmental Protection': 'environment',
  'Immigration': 'immigration',
  'Housing and Community Development': 'housing',
  'Armed Forces and National Security': 'defense',
  'Taxation': 'taxation',
  'Science, Technology, Communications': 'technology',
  'Transportation and Public Works': 'transportation',
  'Economics and Public Finance': 'economy',
  'Finance and Financial Sector': 'economy',
  'International Affairs': 'foreign-affairs',
  'Foreign Trade and International Finance': 'foreign-affairs',
  'Government Operations and Politics': 'government',
  'Congress': 'government',
  'Energy': 'energy',
  'Agriculture and Food': 'agriculture',
  'Labor and Employment': 'labor',
  'Native Americans': 'civil-rights',
};

let TAG_ID_BY_SLUG = null;

async function loadTagIndex() {
  if (TAG_ID_BY_SLUG) return TAG_ID_BY_SLUG;
  const { data, error } = await sb.from('issue_tags').select('id, slug');
  if (error) throw error;
  TAG_ID_BY_SLUG = Object.fromEntries(data.map((r) => [r.slug, r.id]));
  return TAG_ID_BY_SLUG;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  return res.json();
}

function deriveBillFields(detail) {
  const bill = detail.bill ?? detail;
  const number = bill.number ?? bill.billNumber;
  const type = (bill.type ?? bill.billType ?? '').toLowerCase();
  const congress = bill.congress;
  const chamberMap = { hr: 'House', s: 'Senate', hjres: 'House', sjres: 'Senate', hconres: 'House', sconres: 'Senate', hres: 'House', sres: 'Senate' };
  const chamber = chamberMap[type] ?? bill.originChamber ?? null;

  return {
    source_id: `${congress}-${type}-${number}`,
    session_label: `${congress}th Congress`,
    chamber,
    bill_number: `${type.toUpperCase()}.${number}`,
    bill_type: type,
    title_en: bill.title ?? null,
    summary_en: bill.summaries?.summaries?.[0]?.text?.replace(/<[^>]+>/g, '') ?? null,
    status_code: bill.latestAction?.actionTime ? null : null,
    introduced_at: bill.introducedDate ? new Date(bill.introducedDate).toISOString() : null,
    latest_action_at: bill.latestAction?.actionDate
      ? new Date(bill.latestAction.actionDate).toISOString()
      : null,
    latest_action_text: bill.latestAction?.text ?? null,
    source_url: bill.url
      ? bill.url.replace('https://api.congress.gov/v3/', 'https://www.congress.gov/bill/').replace(/\?.*$/, '')
      : null,
  };
}

async function recordArtifact(url, payload) {
  const body = JSON.stringify(payload);
  const hash = sha(body);
  const { data, error } = await sb
    .from('source_artifacts')
    .upsert(
      {
        source_system: SOURCE_SYSTEM,
        source_id: url,
        fetch_url: url,
        content_type: 'application/json',
        content_hash: hash,
        parse_status: 'parsed',
        license_code: 'us_public_domain',
        payload,
      },
      { onConflict: 'source_system,source_id,content_hash', ignoreDuplicates: false },
    )
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ingestBill(listEntry) {
  const detailUrl = listEntry.url + (listEntry.url.includes('?') ? '&' : '?') + `api_key=${API_KEY}`;
  const detail = await fetchJson(detailUrl);
  const sanitized = JSON.parse(JSON.stringify(detail));
  const artifactId = await recordArtifact(listEntry.url, sanitized);
  const fields = deriveBillFields(detail);

  const row = {
    jurisdiction_id: US_FEDERAL_JURISDICTION_ID,
    source_system: SOURCE_SYSTEM,
    is_official: true,
    ...fields,
  };

  const { data: bill, error: billErr } = await sb
    .from('bills')
    .upsert(row, { onConflict: 'source_system,source_id' })
    .select('id')
    .single();
  if (billErr) throw billErr;

  // Pull recent actions for richer detail. Congress.gov actions endpoint.
  const actionsUrl = `${listEntry.url.replace(/\?.*$/, '')}/actions?api_key=${API_KEY}&limit=20`;
  try {
    const actions = await fetchJson(actionsUrl);
    const items = actions.actions ?? [];
    if (items.length) {
      const actionRows = items
        .filter((a) => a.actionDate)
        .map((a) => ({
          bill_id: bill.id,
          // Always interpret as UTC so the date-only check on the client works.
          occurred_at: new Date(
            a.actionTime
              ? `${a.actionDate}T${a.actionTime}Z`
              : `${a.actionDate}T00:00:00Z`,
          ).toISOString(),
          chamber: a.chamber ?? null,
          action_code: a.actionCode ?? null,
          action_text: a.text ?? '',
          source_artifact_id: artifactId,
        }));
      if (actionRows.length) {
        // Replace recent actions for simplicity. (For production: dedupe properly.)
        await sb.from('bill_actions').delete().eq('bill_id', bill.id);
        const { error: actErr } = await sb.from('bill_actions').insert(actionRows);
        if (actErr) throw actErr;
      }
    }
  } catch (err) {
    console.warn(`  ! actions fetch failed for ${fields.bill_number}: ${err.message}`);
  }

  // Issue tagging from CRS policy area.
  const policyAreaName = detail.bill?.policyArea?.name;
  if (policyAreaName) {
    const slug = POLICY_AREA_TO_SLUG[policyAreaName];
    if (slug) {
      const tags = await loadTagIndex();
      const tagId = tags[slug];
      if (tagId) {
        await sb.from('bill_issue_tags').delete().eq('bill_id', bill.id);
        await sb.from('bill_issue_tags').insert({ bill_id: bill.id, issue_tag_id: tagId });
      }
    }
  }

  // Sponsors from Congress.gov.
  const sponsors = detail.bill?.sponsors ?? [];
  if (sponsors.length) {
    const personRows = sponsors
      .filter((s) => s.bioguideId)
      .map((s) => ({
        jurisdiction_id: US_FEDERAL_JURISDICTION_ID,
        bioguide_id: s.bioguideId,
        name: s.fullName ?? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
        party: s.party ?? null,
        state_or_province: s.state ?? null,
        district: s.district != null ? String(s.district) : null,
        source_url: s.bioguideId
          ? `https://bioguide.congress.gov/search/bio/${s.bioguideId}`
          : null,
      }));
    if (personRows.length) {
      const { data: persons, error: pErr } = await sb
        .from('persons')
        .upsert(personRows, { onConflict: 'jurisdiction_id,bioguide_id' })
        .select('id, bioguide_id');
      if (pErr) {
        console.warn(`  ! persons upsert failed for ${fields.bill_number}: ${pErr.message}`);
      } else {
        const byBg = Object.fromEntries(persons.map((p) => [p.bioguide_id, p.id]));
        const sponsorRows = sponsors
          .filter((s) => byBg[s.bioguideId])
          .map((s) => ({
            bill_id: bill.id,
            person_id: byBg[s.bioguideId],
            role: 'sponsor',
            added_at: detail.bill?.introducedDate
              ? new Date(detail.bill.introducedDate).toISOString()
              : null,
          }));
        await sb.from('sponsorships').delete().eq('bill_id', bill.id).eq('role', 'sponsor');
        if (sponsorRows.length) {
          const { error: spErr } = await sb.from('sponsorships').insert(sponsorRows);
          if (spErr) {
            console.warn(`  ! sponsorships failed for ${fields.bill_number}: ${spErr.message}`);
          }
        }
      }
    }
  }

  return fields.bill_number;
}

async function main() {
  console.log(`Fetching up to ${LIMIT} recent bills from ${CONGRESS}th Congress...`);
  const listUrl = `https://api.congress.gov/v3/bill/${CONGRESS}?api_key=${API_KEY}&limit=${LIMIT}&sort=updateDate+desc&format=json`;
  const list = await fetchJson(listUrl);
  const bills = list.bills ?? [];
  console.log(`Got ${bills.length} bills. Ingesting...`);

  let ok = 0;
  let fail = 0;
  for (const b of bills) {
    try {
      const num = await ingestBill(b);
      ok += 1;
      console.log(`  ✓ ${num}`);
    } catch (err) {
      fail += 1;
      console.error(`  ✗ ${b.number}: ${err.message}`);
    }
  }
  console.log(`Done. ${ok} ok, ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
