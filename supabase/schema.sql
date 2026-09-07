-- StandSync Spaces — schema
-- Run this in the Elevate Supabase project's SQL editor (Project → SQL Editor → New query).
-- Every table is prefixed spaces_ so it never touches Elevate's existing tables.

create extension if not exists "pgcrypto";

-- ── Offices ──────────────────────────────────────────────────────────────
create table if not exists spaces_offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Seats ────────────────────────────────────────────────────────────────
create table if not exists spaces_seats (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references spaces_offices(id) on delete cascade,
  seat_number text not null,
  section text not null check (section in ('pod', 'bay')),
  pod_index int,
  row_index int,
  col_index int not null,
  facing text,
  occupied boolean not null default false,
  name text,
  email text,
  phone text,
  org text,
  collab text,
  updated_at timestamptz not null default now(),
  unique (office_id, seat_number)
);

-- ── Roles (admin / manager) ──────────────────────────────────────────────
create table if not exists spaces_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'manager')),
  created_at timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table spaces_offices enable row level security;
alter table spaces_seats enable row level security;
alter table spaces_user_roles enable row level security;

create policy "Authenticated users can read offices"
  on spaces_offices for select
  to authenticated
  using (true);

create policy "Authenticated users can read seats"
  on spaces_seats for select
  to authenticated
  using (true);

create policy "Admins can update seats"
  on spaces_seats for update
  to authenticated
  using (exists (
    select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'
  ));

create policy "Users can read their own role"
  on spaces_user_roles for select
  to authenticated
  using (user_id = auth.uid());

-- After running this once, promote the first admin manually, e.g.:
--   insert into spaces_user_roles (user_id, role)
--   values ('<your-auth-user-id>', 'admin');
-- Find your user id under Authentication → Users in the Supabase dashboard.

-- ── Seed: Bangalore Office 1 & 2 (4 pods x 3 seats + 8 bay rows x 7 seats = 68 seats each) ──
do $$
declare
  office_id uuid;
  office_names text[] := array['Bangalore — Office 1', 'Bangalore — Office 2'];
  prefixes text[] := array['B1', 'B2'];
  i int;
  p int;
  r int;
  c int;
  seat_num int;
begin
  for i in 1..2 loop
    insert into spaces_offices (name, location, sort_order)
    values (office_names[i], 'Bangalore', i)
    on conflict (name) do nothing
    returning id into office_id;

    if office_id is null then
      select id into office_id from spaces_offices where name = office_names[i];
    end if;

    seat_num := 0;

    -- pods: 4 pods x 3 seats
    for p in 0..3 loop
      for c in 0..2 loop
        seat_num := seat_num + 1;
        insert into spaces_seats (office_id, seat_number, section, pod_index, col_index)
        values (office_id, prefixes[i] || '-' || lpad(seat_num::text, 2, '0'), 'pod', p, c)
        on conflict (office_id, seat_number) do nothing;
      end loop;
    end loop;

    -- bay: 8 rows x 7 seats, alternating facing
    for r in 0..7 loop
      for c in 0..6 loop
        seat_num := seat_num + 1;
        insert into spaces_seats (office_id, seat_number, section, row_index, col_index, facing)
        values (
          office_id,
          prefixes[i] || '-' || lpad(seat_num::text, 2, '0'),
          'bay',
          r,
          c,
          case when r % 2 = 0 then 'up' else 'down' end
        )
        on conflict (office_id, seat_number) do nothing;
      end loop;
    end loop;
  end loop;
end $$;
