-- Cartograph Seed Data for Phase 2 Acceptance Testing

-- 1. Insert known organizations (from Clerk)
insert into public.organizations (id, name)
values
  ('org_3KBHeI8kM0WY7AU5oqHni1ae300', 'Ankit''s Organization'),
  ('org_3KBHiGyXxwNJZBImY5f9mccusHB', '2nd Organisation'),
  ('org_3KB9Aq3zyRRNoqrxsmC70USj4xx', 'My Organization')
on conflict (id) do update set name = excluded.name;

-- 2. Projects for Org 1 (Ankit's Organization)
insert into public.projects (id, organization_id, name, repository_url, default_branch)
values
  ('11111111-1111-4111-a111-111111111111', 'org_3KBHeI8kM0WY7AU5oqHni1ae300', 'facebook/react', 'https://github.com/facebook/react', 'main'),
  ('22222222-2222-4222-a222-222222222222', 'org_3KBHeI8kM0WY7AU5oqHni1ae300', 'vercel/next.js', 'https://github.com/vercel/next.js', 'canary')
on conflict (id) do nothing;

-- Analyses for Org 1
insert into public.analyses (id, organization_id, project_id, commit_hash, status, file_count, edge_count, route_count, coverage_percent, stats, error_message, created_at)
values
  (
    'a1111111-1111-4111-a111-111111111111',
    'org_3KBHeI8kM0WY7AU5oqHni1ae300',
    '11111111-1111-4111-a111-111111111111',
    'e8f492b',
    'ready',
    312,
    1420,
    0,
    94.50,
    '{"unresolved_imports": 8, "total_lines": 48200}'::jsonb,
    null,
    now() - interval '2 hours'
  ),
  (
    'a2222222-2222-4222-a222-222222222222',
    'org_3KBHeI8kM0WY7AU5oqHni1ae300',
    '22222222-2222-4222-a222-222222222222',
    '7c9a101',
    'parsing',
    184,
    812,
    16,
    88.00,
    '{"unresolved_imports": 3, "total_lines": 31500}'::jsonb,
    null,
    now() - interval '25 minutes'
  ),
  (
    'a3333333-3333-4333-a333-333333333333',
    'org_3KBHeI8kM0WY7AU5oqHni1ae300',
    '11111111-1111-4111-a111-111111111111',
    '9a41b2c',
    'failed',
    0,
    0,
    0,
    null,
    '{}'::jsonb,
    'Archive extraction error: repository tarball checksum mismatch',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- 3. Projects for Org 2 (2nd Organisation)
insert into public.projects (id, organization_id, name, repository_url, default_branch)
values
  ('33333333-3333-4333-a333-333333333333', 'org_3KBHiGyXxwNJZBImY5f9mccusHB', 'expressjs/express', 'https://github.com/expressjs/express', 'master'),
  ('44444444-4444-4444-a444-444444444444', 'org_3KBHiGyXxwNJZBImY5f9mccusHB', 'tailwindlabs/tailwindcss', 'https://github.com/tailwindlabs/tailwindcss', 'main')
on conflict (id) do nothing;

-- Analyses for Org 2
insert into public.analyses (id, organization_id, project_id, commit_hash, status, file_count, edge_count, route_count, coverage_percent, stats, error_message, created_at)
values
  (
    'b1111111-1111-4111-a111-111111111111',
    'org_3KBHiGyXxwNJZBImY5f9mccusHB',
    '33333333-3333-4333-a333-333333333333',
    '3d1f054',
    'ready',
    42,
    156,
    0,
    98.20,
    '{"unresolved_imports": 0, "total_lines": 5890}'::jsonb,
    null,
    now() - interval '4 hours'
  ),
  (
    'b2222222-2222-4222-a222-222222222222',
    'org_3KBHiGyXxwNJZBImY5f9mccusHB',
    '44444444-4444-4444-a444-444444444444',
    'b4c801e',
    'pending',
    0,
    0,
    0,
    null,
    '{}'::jsonb,
    null,
    now() - interval '10 minutes'
  )
on conflict (id) do nothing;

-- Note: Org 3 ('org_3KB9Aq3zyRRNoqrxsmC70USj4xx') has zero projects and zero analyses to verify the empty state!
