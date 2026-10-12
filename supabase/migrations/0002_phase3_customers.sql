-- ReviewLoop Phase 3: WhatsApp handoff, prepared sends, and the compliance
-- backstop for opt-out and the 30-day rule. Run once in the Supabase SQL
-- editor after 0001_init.sql.
--
-- Why a trigger rather than a row-level policy: a policy that queries the
-- table it protects raises an infinite-recursion error in Postgres, and the
-- browser must never be able to record a request the rules forbid. The UI
-- disables the button and says why; this makes the rule hold on every path,
-- including a hand-rolled client.

-- Channel gains whatsapp. Status gains 'prepared': the owner opened WhatsApp
-- with the text, so we cannot claim delivery — 'sent' stays reserved for
-- sends Phase 4 actually makes.
alter table public.messages
  drop constraint if exists messages_channel_check;
alter table public.messages
  add constraint messages_channel_check check (channel in ('sms', 'email', 'whatsapp'));

alter table public.messages
  drop constraint if exists messages_status_check;
alter table public.messages
  add constraint messages_status_check
  check (status in ('queued', 'sending', 'sent', 'failed', 'prepared'));

-- Serves both the 30-day lookup and the "last asked" read on the customers page.
create index if not exists messages_customer_created_idx
  on public.messages (customer_id, created_at desc);

-- One number, one customer, one business. Makes CSV re-imports safe: the
-- second copy of a file is refused by the database, not just by our checks.
create unique index if not exists customers_business_phone_uk
  on public.customers (business_id, phone)
  where phone is not null;

create or replace function public.messages_before_insert_guard()
returns trigger
language plpgsql
as $$
declare
  v_opted_out boolean;
  v_recent boolean;
begin
  -- Not visible to this caller means row-level security owns the decision:
  -- hand the row back and let the WITH CHECK policy answer (403 for a
  -- stranger) instead of pre-empting it with this trigger's error.
  select opted_out into v_opted_out
    from public.customers
   where id = new.customer_id;
  if not found then
    return new;
  end if;

  if v_opted_out then
    raise exception 'This customer has opted out and cannot be messaged.'
      using errcode = '23514';
  end if;

  -- Every status except failed counts, queued included: a queued row is a
  -- request waiting to go out. Phase 4's job still re-checks before sending.
  select exists (
    select 1
      from public.messages m
     where m.customer_id = new.customer_id
       and m.status <> 'failed'
       and m.created_at > now() - interval '30 days'
  ) into v_recent;

  if v_recent then
    raise exception 'This customer was already asked for a review within the last 30 days.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert
  before insert on public.messages
  for each row
  execute function public.messages_before_insert_guard();
