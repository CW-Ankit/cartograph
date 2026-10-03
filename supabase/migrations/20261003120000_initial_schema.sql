-- Cartograph Phase 2: Initial Schema & Multi-Tenant Row Level Security

-- 1. Organizations root tenancy table
create table if not exists public.organizations (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  repository_url text not null,
  default_branch text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Analyses table
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  commit_hash text,
  status text not null check (status in ('pending', 'fetching', 'parsing', 'ready', 'failed')),
  error_message text,
  file_count integer not null default 0,
  edge_count integer not null default 0,
  route_count integer not null default 0,
  coverage_percent numeric(5, 2),
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Files table
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  path text not null,
  folder text not null,
  line_count integer not null default 0,
  content_hash text,
  fan_in integer not null default 0,
  fan_out integer not null default 0,
  created_at timestamptz not null default now()
);

-- 5. Edges table
create table if not exists public.edges (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  source_file_id uuid not null references public.files(id) on delete cascade,
  target_file_id uuid not null references public.files(id) on delete cascade,
  kind text not null default 'import' check (kind in ('import', 'reexport', 'dynamic', 'require')),
  created_at timestamptz not null default now()
);

-- 6. Routes table
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  method text not null,
  path_pattern text not null,
  created_at timestamptz not null default now()
);

-- 7. Explanations table
create table if not exists public.explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  target_type text not null check (target_type in ('file', 'folder')),
  target_id text not null,
  content_hash text not null,
  model_name text not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

-- 8. File Roles table
create table if not exists public.file_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  role text not null,
  source text not null default 'convention' check (source in ('convention', 'ai')),
  created_at timestamptz not null default now()
);

-- 9. Insights table
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  kind text not null check (kind in ('cycle', 'orphan', 'high_dependency', 'long_file')),
  file_id uuid references public.files(id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Foreign key indexes (Supabase Postgres performance best practices)
create index if not exists idx_projects_organization_id on public.projects(organization_id);

create index if not exists idx_analyses_organization_id on public.analyses(organization_id);
create index if not exists idx_analyses_project_id on public.analyses(project_id);

create index if not exists idx_files_organization_id on public.files(organization_id);
create index if not exists idx_files_analysis_id on public.files(analysis_id);

create index if not exists idx_edges_organization_id on public.edges(organization_id);
create index if not exists idx_edges_analysis_id on public.edges(analysis_id);
create index if not exists idx_edges_source_file_id on public.edges(source_file_id);
create index if not exists idx_edges_target_file_id on public.edges(target_file_id);

create index if not exists idx_routes_organization_id on public.routes(organization_id);
create index if not exists idx_routes_analysis_id on public.routes(analysis_id);
create index if not exists idx_routes_file_id on public.routes(file_id);

create index if not exists idx_explanations_organization_id on public.explanations(organization_id);
create index if not exists idx_explanations_analysis_id on public.explanations(analysis_id);

create index if not exists idx_file_roles_organization_id on public.file_roles(organization_id);
create index if not exists idx_file_roles_analysis_id on public.file_roles(analysis_id);
create index if not exists idx_file_roles_file_id on public.file_roles(file_id);

create index if not exists idx_insights_organization_id on public.insights(organization_id);
create index if not exists idx_insights_analysis_id on public.insights(analysis_id);
create index if not exists idx_insights_file_id on public.insights(file_id);

-- Enable Row Level Security (RLS) on all tables
alter table public.organizations enable row level security;
alter table public.projects enable row level security;
alter table public.analyses enable row level security;
alter table public.files enable row level security;
alter table public.edges enable row level security;
alter table public.routes enable row level security;
alter table public.explanations enable row level security;
alter table public.file_roles enable row level security;
alter table public.insights enable row level security;

-- Row Level Security policies reading organization claim off the auth token
create policy "organizations_isolation_policy"
  on public.organizations
  for all
  using (id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

create policy "projects_org_isolation_policy"
  on public.projects
  for all
  using (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

create policy "analyses_org_isolation_policy"
  on public.analyses
  for all
  using (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

create policy "files_org_isolation_policy"
  on public.files
  for all
  using (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

create policy "edges_org_isolation_policy"
  on public.edges
  for all
  using (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

create policy "routes_org_isolation_policy"
  on public.routes
  for all
  using (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

create policy "explanations_org_isolation_policy"
  on public.explanations
  for all
  using (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

create policy "file_roles_org_isolation_policy"
  on public.file_roles
  for all
  using (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

create policy "insights_org_isolation_policy"
  on public.insights
  for all
  using (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')))
  with check (organization_id = (select coalesce(nullif(current_setting('request.jwt.claim.org_id', true), ''), auth.jwt() ->> 'org_id', auth.jwt() -> 'o' ->> 'id')));

-- Grant Data API access
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
