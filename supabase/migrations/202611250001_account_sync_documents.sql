-- Versioned, user-owned account snapshots used only for application-owned data.
-- Auth credentials, managed content, group data, native permissions, and local
-- file paths are intentionally outside this table.
create table if not exists public.account_sync_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 1 check (version > 0),
  document jsonb not null default '{}'::jsonb check (jsonb_typeof(document) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by_device text,
  created_at timestamptz not null default now()
);

create index if not exists account_sync_documents_updated_at_idx
  on public.account_sync_documents(updated_at desc);

alter table public.account_sync_documents enable row level security;

drop policy if exists account_sync_documents_owner_read on public.account_sync_documents;
create policy account_sync_documents_owner_read
on public.account_sync_documents for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists account_sync_documents_owner_insert on public.account_sync_documents;
create policy account_sync_documents_owner_insert
on public.account_sync_documents for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists account_sync_documents_owner_update on public.account_sync_documents;
create policy account_sync_documents_owner_update
on public.account_sync_documents for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on table public.account_sync_documents from anon;
-- Clients may read their own row; all writes go through the guarded RPC below.
revoke insert, update, delete on table public.account_sync_documents from authenticated;
grant select on table public.account_sync_documents to authenticated;

create or replace function public.push_account_sync_document(
  document_value jsonb,
  expected_version bigint,
  device_key text
)
returns table (accepted boolean, version bigint, document jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_row public.account_sync_documents%rowtype;
  saved_version bigint;
  saved_document jsonb;
  saved_updated_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required for account synchronization.';
  end if;
  if jsonb_typeof(document_value) <> 'object' then
    raise exception 'Account sync document must be a JSON object.';
  end if;
  if char_length(coalesce(device_key, '')) > 128 then
    raise exception 'Device key is too long.';
  end if;

  select * into current_row
  from public.account_sync_documents
  where user_id = auth.uid()
  for update;

  if not found then
    if expected_version is not null and expected_version <> 0 then
      return query select false, 0::bigint, '{}'::jsonb, now();
      return;
    end if;
    insert into public.account_sync_documents (user_id, version, document, updated_by_device)
    values (auth.uid(), 1, document_value, nullif(btrim(device_key), ''))
    returning version, document, updated_at
    into saved_version, saved_document, saved_updated_at;
    return query select true, saved_version, saved_document, saved_updated_at;
    return;
  end if;

  if expected_version is null or current_row.version <> expected_version then
    return query select false, current_row.version, current_row.document, current_row.updated_at;
    return;
  end if;

  update public.account_sync_documents
  set version = current_row.version + 1,
      document = document_value,
      updated_at = now(),
      updated_by_device = nullif(btrim(device_key), '')
  where user_id = auth.uid()
  returning version, document, updated_at
  into saved_version, saved_document, saved_updated_at;

  return query select true, saved_version, saved_document, saved_updated_at;
end;
$$;

revoke all on function public.push_account_sync_document(jsonb, bigint, text) from public, anon;
grant execute on function public.push_account_sync_document(jsonb, bigint, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'account_sync_documents'
     ) then
    alter publication supabase_realtime add table public.account_sync_documents;
  end if;
end
$$;
