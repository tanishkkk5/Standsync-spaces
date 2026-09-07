-- StandSync Spaces — migration 004: rich SVG floor map
-- Run after migration_003. Safe to run once.

-- Zone labels (e.g. "MARKETING", "FINANCE", "SALES")
create table if not exists spaces_zones (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references spaces_offices(id) on delete cascade,
  label text not null,
  x real not null,       -- percent of canvas width
  y real not null,       -- percent of canvas height
  w real not null default 20,
  h real not null default 15,
  color text default 'rgba(99,102,241,0.08)',
  created_at timestamptz not null default now()
);

alter table spaces_zones enable row level security;
create policy "Auth users read zones" on spaces_zones for select to authenticated using (true);
create policy "Admins manage zones" on spaces_zones for all to authenticated
  using (exists (select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'))
  with check (exists (select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'));

-- Desk positions on the canvas (percent-based, so it's resolution-independent)
alter table spaces_seats add column if not exists cx real default 50; -- % x center
alter table spaces_seats add column if not exists cy real default 50; -- % y center
alter table spaces_seats add column if not exists zone_id uuid references spaces_zones(id) on delete set null;
alter table spaces_seats add column if not exists desk_label text; -- optional extra label shown under the dot

-- Structural elements (walls, rooms, lounge areas, kitchen etc.)
alter table spaces_layout_blocks add column if not exists rx real default 4; -- border radius %
alter table spaces_layout_blocks add column if not exists opacity real default 1;
