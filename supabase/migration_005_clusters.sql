-- StandSync Spaces — migration 005: desk clusters
-- Run after migration_004. Safe to run once.

create table if not exists spaces_clusters (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references spaces_offices(id) on delete cascade,
  cx real not null,
  cy real not null,
  cluster_type text not null default '4',
  created_at timestamptz not null default now()
);

alter table spaces_clusters enable row level security;
create policy "Auth read clusters" on spaces_clusters for select to authenticated using (true);
create policy "Admins manage clusters" on spaces_clusters for all to authenticated
  using (exists (select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'))
  with check (exists (select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'));

alter table spaces_seats
  add column if not exists cluster_id uuid references spaces_clusters(id) on delete cascade,
  add column if not exists cluster_pos int;
