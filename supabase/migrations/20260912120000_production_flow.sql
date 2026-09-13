alter table expense.income_entries add column account text;
alter table expense.expenses add column account text;
create table expense.skipped_occurrences (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(user_id, id)
);
alter table expense.skipped_occurrences enable row level security;
create policy "Manage own skipped occurrences" on expense.skipped_occurrences for all to authenticated using(auth.uid() = user_id) with check(auth.uid() = user_id);
grant select, insert, delete on expense.skipped_occurrences to authenticated;

alter table expense.income_entries add column occurrence_key text;
alter table expense.expenses add column occurrence_key text;

-- Only unambiguous legacy links can be assigned an occurrence automatically.
update expense.expenses e set occurrence_key = 'auto-expense-' || e.bill_id || '-' || to_char(e.date, 'YYYY-MM')
from (select user_id, bill_id, to_char(date, 'YYYY-MM') as occurrence_month from expense.expenses where bill_id is not null and not is_generated group by user_id, bill_id, to_char(date, 'YYYY-MM') having count(*) = 1) x
where e.user_id = x.user_id and e.bill_id = x.bill_id and to_char(e.date, 'YYYY-MM') = x.occurrence_month and not e.is_generated;
update expense.income_entries e set occurrence_key = 'auto-income-' || e.source_id || case when e.cutoff is null then '' else '-' || e.cutoff end || '-' || to_char(e.date, 'YYYY-MM')
from (select user_id, source_id, cutoff, to_char(date, 'YYYY-MM') as occurrence_month from expense.income_entries where source_id is not null and not is_generated group by user_id, source_id, cutoff, to_char(date, 'YYYY-MM') having count(*) = 1) x
where e.user_id = x.user_id and e.source_id = x.source_id and e.cutoff is not distinct from x.cutoff and to_char(e.date, 'YYYY-MM') = x.occurrence_month and not e.is_generated;
create unique index income_occurrence_unique on expense.income_entries(user_id, occurrence_key) where occurrence_key is not null;
create unique index expense_occurrence_unique on expense.expenses(user_id, occurrence_key) where occurrence_key is not null;

-- Schedule revisions preserve expectations in months before an edit or deletion.
create table expense.schedule_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check(entity_type in ('income_sources','monthly_bills')),
  entity_id text not null,
  effective_until text not null,
  value jsonb not null
);
alter table expense.schedule_history enable row level security;
create policy "Read own schedule history" on expense.schedule_history for select to authenticated using (auth.uid() = user_id);
grant select on expense.schedule_history to authenticated;
create index schedule_history_user_idx on expense.schedule_history(user_id, effective_until);

create function expense.preserve_schedule() returns trigger
language plpgsql security definer set search_path = '' as $$
declare boundary text; snapshot jsonb;
begin
  -- User deletion by an administrator must still cascade normally.
  if not exists(select 1 from auth.users where id = old.user_id) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if auth.uid() is not null and auth.uid() is distinct from old.user_id then raise exception 'Invalid schedule owner'; end if;
  boundary := coalesce(nullif(current_setting('expense.effective_month', true), ''), to_char(current_date, 'YYYY-MM'));
  if boundary !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid effective month'; end if;
  if exists(select 1 from expense.schedule_history where entity_id = old.id and entity_type = tg_table_name and user_id = old.user_id and effective_until > boundary) then raise exception 'Choose a month on or after the last schedule change'; end if;
  snapshot := to_jsonb(old);
  if tg_table_name = 'income_sources' then
    snapshot := snapshot || jsonb_build_object('payments', coalesce((select jsonb_agg(to_jsonb(s) order by position) from expense.income_schedules s where source_id = old.id and user_id = old.user_id), '[]'::jsonb));
  end if;
  insert into expense.schedule_history(user_id, entity_type, entity_id, effective_until, value) values(old.user_id, tg_table_name, old.id, boundary, snapshot);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function expense.preserve_schedule() from public;
create trigger preserve_income_schedule before update or delete on expense.income_sources for each row execute function expense.preserve_schedule();
create trigger preserve_bill_schedule before update or delete on expense.monthly_bills for each row execute function expense.preserve_schedule();

-- Atomic writes use the caller's permissions and existing row-level policies.
create function expense.commit_finance(payload jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare table_name text; item jsonb; columns_sql text; updates_sql text; conflict_sql text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if payload ? 'effective_month' then
    if payload->>'effective_month' !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid effective month'; end if;
    perform set_config('expense.effective_month', payload->>'effective_month', true);
  end if;
  if payload ? 'delete_income_source' then
    delete from expense.income_sources where id = payload->>'delete_income_source' and user_id = auth.uid();
    if not found then raise exception 'Income source no longer exists'; end if;
  end if;
  if payload ? 'delete_bill' then
    delete from expense.monthly_bills where id = payload->>'delete_bill' and user_id = auth.uid();
    if not found then raise exception 'Bill no longer exists'; end if;
  end if;
  foreach table_name in array array['finance_profiles','income_sources','monthly_bills','income_schedules','income_entries','expenses','savings_snapshots'] loop
    if table_name = 'income_schedules' and payload ? 'replace_schedules' then
      delete from expense.income_schedules where source_id = payload->>'replace_schedules' and user_id = auth.uid();
    end if;
    for item in select value from jsonb_array_elements(coalesce(payload->table_name, '[]'::jsonb)) loop
      if item->>'user_id' is distinct from auth.uid()::text then raise exception 'Invalid row owner'; end if;
      select string_agg(format('%I', key), ', '), string_agg(format('%I = excluded.%I', key, key), ', ') filter (where key not in ('id','user_id','created_at'))
      into columns_sql, updates_sql from jsonb_object_keys(item) as key;
      conflict_sql := case when payload->>'import' = 'true' and table_name <> 'finance_profiles' then 'on conflict do nothing' else format('on conflict (%I) do update set %s', case when table_name = 'finance_profiles' then 'user_id' else 'id' end, updates_sql) end;
      execute format('insert into expense.%I (%s) select %s from jsonb_populate_record(null::expense.%I, $1) %s', table_name, columns_sql, columns_sql, table_name, conflict_sql) using item;
    end loop;
  end loop;
end $$;
revoke all on function expense.commit_finance(jsonb) from public;
grant execute on function expense.commit_finance(jsonb) to authenticated;
