# StandSync Spaces

Visual seating map + occupancy dashboard for xTransMatrix offices. Shares the
Elevate Supabase project (tables prefixed `spaces_` so nothing collides) and
the Elevate design system (theme tokens + UI components).

## One-time setup

1. **Run the schema.** Open the Elevate Supabase project → SQL Editor → New
   query → paste the contents of `supabase/schema.sql` → Run. This creates
   the `spaces_offices`, `spaces_seats`, and `spaces_user_roles` tables and
   seeds two Bangalore offices with 68 vacant seats each.

2. **Make yourself an admin.** In the Supabase dashboard, go to
   Authentication → Users, create a user for yourself (or use one you
   already have), and copy its User UID. Then in the SQL Editor run:

   ```sql
   insert into spaces_user_roles (user_id, role)
   values ('paste-your-user-uid-here', 'admin');
   ```

   Anyone without a row in `spaces_user_roles` who still signs in is treated
   as a manager (read-only) by default.

3. **Environment variables.** Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` — Project Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — Project Settings → API → anon public key

   On Vercel, add the same two variables under Project Settings →
   Environment Variables before deploying.

## Local development

```bash
npm install
npm run dev
```

## What's here

- `src/foundation/theme` — Elevate's exact design tokens + light/dark theme provider
- `src/foundation/ui` — shared Button/Card/Input/Modal/misc components, copied from Elevate
- `src/auth` — Supabase-auth login + role resolution (admin/manager)
- `src/features/seating` — the seating map, edit modal, dashboard, and the
  sheet download/upload (admin-only) that lets you fill in occupant data in
  Excel and re-upload it
