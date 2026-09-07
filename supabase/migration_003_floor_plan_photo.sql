-- StandSync Spaces — migration 003: photo floor plan + pins
-- Run this AFTER migration_002_layout_editor.sql. Safe to run once.

alter table spaces_offices add column if not exists floor_plan_url text;

alter table spaces_seats add column if not exists pin_x real; -- 0..1, fraction of image width
alter table spaces_seats add column if not exists pin_y real; -- 0..1, fraction of image height

-- Storage bucket for floor plan images (public read, admin write)
insert into storage.buckets (id, name, public)
values ('floorplans', 'floorplans', true)
on conflict (id) do nothing;

drop policy if exists "Admins can upload floor plans" on storage.objects;
create policy "Admins can upload floor plans"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'floorplans'
    and exists (select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin')
  );

drop policy if exists "Admins can update floor plans" on storage.objects;
create policy "Admins can update floor plans"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'floorplans'
    and exists (select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin')
  );

drop policy if exists "Admins can delete floor plans" on storage.objects;
create policy "Admins can delete floor plans"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'floorplans'
    and exists (select 1 from spaces_user_roles r where r.user_id = auth.uid() and r.role = 'admin')
  );
