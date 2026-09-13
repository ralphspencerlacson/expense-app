-- Run against the intended staging database before applying the forward migration.
-- This script reports aggregate counts and does not modify records.
begin transaction read only;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'finance_profiles', 'income_sources', 'income_schedules',
    'monthly_bills', 'income_entries', 'expenses', 'savings_snapshots'
  ] loop
    if to_regclass(format('expense.%I', table_name)) is null then
      raise exception 'Missing baseline table expense.%. Apply the baseline migrations first.', table_name;
    end if;
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'expense' and c.relname = table_name and c.relrowsecurity
    ) then
      raise exception 'Row-level security is disabled on expense.%', table_name;
    end if;
  end loop;
end $$;

select current_database() as database_name,
       current_user as database_role,
       to_regclass('expense.schedule_history') is not null as history_table_exists,
       to_regclass('expense.skipped_occurrences') is not null as skip_table_exists;

select table_name, column_name
from information_schema.columns
where table_schema = 'expense'
  and table_name in ('income_entries', 'expenses')
  and column_name in ('account', 'occurrence_key')
order by table_name, column_name;

select 'income_sources' as table_name, count(*) as rows from expense.income_sources
union all select 'income_schedules', count(*) from expense.income_schedules
union all select 'monthly_bills', count(*) from expense.monthly_bills
union all select 'income_entries', count(*) from expense.income_entries
union all select 'expenses', count(*) from expense.expenses;

-- Multiple linked payments within one month require manual reconciliation.
select 'expenses' as record_type, count(*) as ambiguous_occurrence_groups
from (
  select user_id, bill_id, to_char(date, 'YYYY-MM')
  from expense.expenses where bill_id is not null and not is_generated
  group by user_id, bill_id, to_char(date, 'YYYY-MM') having count(*) > 1
) grouped
union all
select 'income_entries', count(*)
from (
  select user_id, source_id, cutoff, to_char(date, 'YYYY-MM')
  from expense.income_entries where source_id is not null and not is_generated
  group by user_id, source_id, cutoff, to_char(date, 'YYYY-MM') having count(*) > 1
) grouped;

select tablename, cmd as allowed_operation, roles
from pg_policies where schemaname = 'expense'
order by tablename, cmd;

commit;
