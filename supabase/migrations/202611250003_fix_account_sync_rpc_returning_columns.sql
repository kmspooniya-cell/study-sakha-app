-- Fix PostgreSQL name resolution in the account-sync RPC. The RETURNS TABLE
-- output names otherwise collide with unqualified RETURNING column names on
-- insert/update. No data or authorization semantics are changed.
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
    returning account_sync_documents.version,
      account_sync_documents.document,
      account_sync_documents.updated_at
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
  returning account_sync_documents.version,
    account_sync_documents.document,
    account_sync_documents.updated_at
  into saved_version, saved_document, saved_updated_at;

  return query select true, saved_version, saved_document, saved_updated_at;
end;
$$;

revoke all on function public.push_account_sync_document(jsonb, bigint, text) from public, anon;
grant execute on function public.push_account_sync_document(jsonb, bigint, text) to authenticated;
