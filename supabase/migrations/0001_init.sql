-- ReviewLoop Phase 2: schema, row-level security, and API grants.
-- Run once in the Supabase SQL editor on a fresh project.
--
-- The project has "Automatically expose new tables" OFF and automatic RLS ON.
-- These GRANTs are the explicit, table-by-table API access. anon gets nothing on
-- every table; authenticated gets only what the app needs, scoped by RLS to the
-- signed-in owner's own rows; service_role (server-only key) bypasses RLS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One owner has at most one business (multi-location is out of scope for v1).
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  google_review_link text not null,
  message_template text not null,
  delay_setting integer not null default 120, -- minutes; stored now, used in Phase 4
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  opted_out boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  send_at timestamptz,
  sent_at timestamptz,
  clicked_at timestamptz,
  tracking_token text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Holds Formspree signups for a later import. Not exposed via the API this phase:
-- it has no grants to anon/authenticated and no RLS policies, so the browser
-- cannot read or write it. The service role can reach it for the future import.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger (self-contained, no extension dependency)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: enabled on every table
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.messages enable row level security;
alter table public.feedback enable row level security;
alter table public.waitlist enable row level security;

-- businesses: an owner touches only their own row.
drop policy if exists "owners select own business" on public.businesses;
create policy "owners select own business"
  on public.businesses for select
  using (auth.uid() = owner_id);

drop policy if exists "owners insert own business" on public.businesses;
create policy "owners insert own business"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

drop policy if exists "owners update own business" on public.businesses;
create policy "owners update own business"
  on public.businesses for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "owners delete own business" on public.businesses;
create policy "owners delete own business"
  on public.businesses for delete
  using (auth.uid() = owner_id);

-- customers: reachable only through a business the caller owns. The subquery is
-- itself filtered by the businesses RLS policy, so it cannot be used to probe
-- other owners' businesses.
drop policy if exists "owners select own customers" on public.customers;
create policy "owners select own customers"
  on public.customers for select
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  ));

drop policy if exists "owners insert own customers" on public.customers;
create policy "owners insert own customers"
  on public.customers for insert
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  ));

drop policy if exists "owners update own customers" on public.customers;
create policy "owners update own customers"
  on public.customers for update
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  ));

drop policy if exists "owners delete own customers" on public.customers;
create policy "owners delete own customers"
  on public.customers for delete
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  ));

-- messages: reachable only through a customer whose business the caller owns.
drop policy if exists "owners select own messages" on public.messages;
create policy "owners select own messages"
  on public.messages for select
  using (exists (
    select 1 from public.customers c
    join public.businesses b on b.id = c.business_id
    where c.id = customer_id and b.owner_id = auth.uid()
  ));

drop policy if exists "owners insert own messages" on public.messages;
create policy "owners insert own messages"
  on public.messages for insert
  with check (exists (
    select 1 from public.customers c
    join public.businesses b on b.id = c.business_id
    where c.id = customer_id and b.owner_id = auth.uid()
  ));

drop policy if exists "owners update own messages" on public.messages;
create policy "owners update own messages"
  on public.messages for update
  using (exists (
    select 1 from public.customers c
    join public.businesses b on b.id = c.business_id
    where c.id = customer_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.customers c
    join public.businesses b on b.id = c.business_id
    where c.id = customer_id and b.owner_id = auth.uid()
  ));

-- feedback: reachable only through a business the caller owns.
drop policy if exists "owners select own feedback" on public.feedback;
create policy "owners select own feedback"
  on public.feedback for select
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  ));

drop policy if exists "owners insert own feedback" on public.feedback;
create policy "owners insert own feedback"
  on public.feedback for insert
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = auth.uid()
  ));

-- waitlist: RLS on and NO policies. Denies anon and authenticated by default.
-- Combined with no grants below, the browser cannot reach it at all.

-- ---------------------------------------------------------------------------
-- API grants: explicit, table by table, narrowest that works
-- ---------------------------------------------------------------------------

-- Start from zero, then grant only what each role needs.
revoke all on public.businesses from anon, authenticated;
revoke all on public.customers from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.feedback from anon, authenticated;
revoke all on public.waitlist from anon, authenticated;

-- authenticated (signed-in owner): full CRUD on their own business; scoped DML
-- on the related tables. RLS restricts every operation to the owner's rows.
grant select, insert, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert on public.feedback to authenticated;

-- waitlist: no grant to anon or authenticated, so the API cannot serve it to the
-- browser. RLS above also denies them. Only the server-side service role reaches
-- it (for the future Formspree import).

-- service_role: the server-only key; bypasses RLS. Zero browser exposure.
grant all on public.businesses to service_role;
grant all on public.customers to service_role;
grant all on public.messages to service_role;
grant all on public.feedback to service_role;
grant all on public.waitlist to service_role;
