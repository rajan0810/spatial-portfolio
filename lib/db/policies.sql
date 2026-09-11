-- Row Level Security, grants and triggers.
--
-- Run AFTER `npm run db:push`, and re-run any time it changes. Idempotent.
--
-- Why this file exists even though the app bypasses RLS: NEXT_PUBLIC_SUPABASE_ANON_KEY
-- ships inside the client bundle, so Supabase's PostgREST API is publicly reachable
-- regardless of what this app does. Anyone can hit it. These policies are what make
-- that surface safe. The app's own Drizzle connection uses a privileged role and is
-- governed instead by explicit filters in lib/data.

begin;

-- ---------------------------------------------------------------------------
-- Admin allow-list
-- ---------------------------------------------------------------------------
-- RLS is enabled with NO policies, which makes the table completely invisible
-- through the API. Only SECURITY DEFINER functions can read it — so the email
-- never appears in this repo or in any client bundle.

create table if not exists public.admin_emails (
  email text primary key
);

alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_emails ae
    where ae.email = (auth.jwt() ->> 'email')
  );
$$;

-- ---------------------------------------------------------------------------
-- profile is a singleton
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profile_singleton'
  ) then
    alter table public.profile add constraint profile_singleton check (id = 'me');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Per-table: grants, RLS, policies, triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  publishable text[] := array['projects', 'achievements', 'timeline', 'skills'];
begin
  foreach t in array publishable loop
    execute format('alter table public.%I enable row level security', t);

    -- Anyone may read published, non-deleted rows. Nothing else.
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format($f$
      create policy %I on public.%I
        for select
        to anon, authenticated
        using (published = true and deleted_at is null)
    $f$, t || '_public_read', t);

    -- Admins get full access, including drafts and soft-deleted rows.
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format($f$
      create policy %I on public.%I
        for all
        to authenticated
        using (public.is_admin())
        with check (public.is_admin())
    $f$, t || '_admin_all', t);

    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);

    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format($f$
      create trigger %I before update on public.%I
        for each row execute function public.touch_updated_at()
    $f$, t || '_touch', t);

    execute format(
      'create index if not exists %I on public.%I (published, sort_order)',
      t || '_published_sort_idx', t
    );
  end loop;
end $$;

-- profile has no `published` column: it is world-readable, admin-writable.
alter table public.profile enable row level security;

drop policy if exists profile_public_read on public.profile;
create policy profile_public_read on public.profile
  for select to anon, authenticated using (true);

drop policy if exists profile_admin_all on public.profile;
create policy profile_admin_all on public.profile
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.profile to anon, authenticated;
grant insert, update on public.profile to authenticated;

drop trigger if exists profile_touch on public.profile;
create trigger profile_touch before update on public.profile
  for each row execute function public.touch_updated_at();

-- Partial index for the common lookup: a published project by slug.
create index if not exists projects_slug_live_idx
  on public.projects (slug) where published = true and deleted_at is null;

commit;
