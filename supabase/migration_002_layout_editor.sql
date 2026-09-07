-- StandSync Spaces — migration 002: free-form layout editor
-- Run this AFTER schema.sql. Safe to run once.

-- ── Grid size per office ─────────────────────────────────────────────────
alter table spaces_offices add column if not exists grid_cols int not null default 10;
alter table spaces_offices add column if not exists grid_rows int not null default 11;

-- ── Seats move to free-form x/y ──────────────────────────────────────────
alter table spaces_seats add column if not exists x int;
alter table spaces_seats add column if not exists y int;
alter table spaces_seats alter column col_index drop not null;
alter table spaces_seats alter column section drop not null;
alter table spaces_seats drop constraint if exists spaces_seats_section_check;

-- Admins need to add/remove seats now, not just edit them.
drop policy if exists "Admins can insert seats" on spaces_seats;
create policy "Admins can insert seats"
  on spaces_seats for insert
  to authenticated
  with check (exists (
    select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'
  ));

drop policy if exists "Admins can delete seats" on spaces_seats;
create policy "Admins can delete seats"
  on spaces_seats for delete
  to authenticated
  using (exists (
    select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'
  ));

-- ── Layout blocks: walls, sitting areas, entrances ───────────────────────
create table if not exists spaces_layout_blocks (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references spaces_offices(id) on delete cascade,
  x int not null,
  y int not null,
  w int not null default 1,
  h int not null default 1,
  block_type text not null check (block_type in ('wall', 'sitting', 'entrance')),
  label text,
  created_at timestamptz not null default now()
);

alter table spaces_layout_blocks enable row level security;

create policy "Authenticated users can read layout blocks"
  on spaces_layout_blocks for select
  to authenticated
  using (true);

create policy "Admins can manage layout blocks"
  on spaces_layout_blocks for all
  to authenticated
  using (exists (
    select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'
  ))
  with check (exists (
    select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin'
  ));

-- ── Backfill: place the originally-seeded seats onto the new grid ────────
-- Reconstructs the same visual arrangement (pods left, bay right, with a
-- wall and sitting area among the bay rows) so nothing looks different
-- until you actually start editing the layout.
update spaces_seats set
  x = case
        when section = 'pod' then col_index % 2
        when section = 'bay' then 3 + col_index
      end,
  y = case
        when section = 'pod' then pod_index * 2 + (col_index / 2)
        when section = 'bay' then case row_index
              when 0 then 0
              when 1 then 1
              when 2 then 2
              when 3 then 3
              when 4 then 5
              when 5 then 6
              when 6 then 8
              when 7 then 9
            end
      end
where x is null;

insert into spaces_layout_blocks (office_id, x, y, w, h, block_type, label)
select id, 3, 4, 7, 1, 'wall', 'Wall' from spaces_offices
where not exists (
  select 1 from spaces_layout_blocks b where b.office_id = spaces_offices.id and b.block_type = 'wall'
);

insert into spaces_layout_blocks (office_id, x, y, w, h, block_type, label)
select id, 3, 7, 7, 1, 'sitting', 'Sitting area' from spaces_offices
where not exists (
  select 1 from spaces_layout_blocks b where b.office_id = spaces_offices.id and b.block_type = 'sitting'
);

insert into spaces_layout_blocks (office_id, x, y, w, h, block_type, label)
select id, 0, 10, 10, 1, 'entrance', 'Entrance' from spaces_offices
where not exists (
  select 1 from spaces_layout_blocks b where b.office_id = spaces_offices.id and b.block_type = 'entrance'
);
