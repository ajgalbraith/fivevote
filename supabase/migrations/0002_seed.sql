-- Seed core jurisdictions (US federal + Canada federal) and a minimal issue vocab.

insert into jurisdictions
  (id, country_code, level, name, ocd_division_id, timezone, languages, official_site_url, source_strategy, license_code)
values
  ('11111111-1111-1111-1111-111111111111', 'US', 'federal', 'United States Congress',
   'ocd-division/country:us', 'America/New_York', array['en'],
   'https://www.congress.gov', 'congress_gov_api', 'us_public_domain'),
  ('22222222-2222-2222-2222-222222222222', 'CA', 'federal', 'Parliament of Canada',
   'ocd-division/country:ca', 'America/Toronto', array['en','fr'],
   'https://www.parl.ca', 'legisinfo', 'oc_canada_open_data')
on conflict (id) do nothing;

insert into issue_tags (slug, display_en, display_fr, source_vocab) values
  ('health',         'Health',         'Santé',                'fivevote_core'),
  ('environment',    'Environment',    'Environnement',        'fivevote_core'),
  ('economy',        'Economy',        'Économie',             'fivevote_core'),
  ('immigration',    'Immigration',    'Immigration',          'fivevote_core'),
  ('justice',        'Justice',        'Justice',              'fivevote_core'),
  ('education',      'Education',      'Éducation',            'fivevote_core'),
  ('housing',        'Housing',        'Logement',             'fivevote_core'),
  ('defense',        'Defense',        'Défense',              'fivevote_core'),
  ('technology',     'Technology',     'Technologie',          'fivevote_core'),
  ('taxation',       'Taxation',       'Fiscalité',            'fivevote_core'),
  ('transportation', 'Transportation', 'Transport',            'fivevote_core'),
  ('civil-rights',   'Civil Rights',   'Droits civils',        'fivevote_core')
on conflict (slug) do nothing;
