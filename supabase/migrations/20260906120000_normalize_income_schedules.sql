create table if not exists expense.income_schedules (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null,
  position integer not null check (position > 0),
  amount numeric not null check (amount >= 0),
  gross_amount numeric check (gross_amount >= 0),
  payment_day integer not null check (payment_day between 1 and 31),
  deductions jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, position),
  foreign key (source_id, user_id) references expense.income_sources(id, user_id) on delete cascade
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'expense' and table_name = 'income_sources' and column_name = 'expected_amount'
  ) then
    insert into expense.income_schedules (id, user_id, source_id, position, amount, gross_amount, payment_day)
    select id || '-monthly', user_id, id, 1, expected_amount, expected_amount, coalesce(monthly_day, 15)
    from expense.income_sources
    where schedule = 'monthly' and expected_amount is not null
    on conflict (source_id, position) do nothing;

    insert into expense.income_schedules (id, user_id, source_id, position, amount, gross_amount, payment_day, deductions)
    select id || '-first', user_id, id, 1, first_cutoff_amount, coalesce(first_cutoff_gross_amount, first_cutoff_amount), coalesce(first_cutoff_day, 15), first_cutoff_deductions
    from expense.income_sources
    where schedule = 'cutoff' and first_cutoff_amount is not null
    on conflict (source_id, position) do nothing;

    insert into expense.income_schedules (id, user_id, source_id, position, amount, gross_amount, payment_day, deductions)
    select id || '-second', user_id, id, 2, second_cutoff_amount, coalesce(second_cutoff_gross_amount, second_cutoff_amount), coalesce(second_cutoff_day, 30), second_cutoff_deductions
    from expense.income_sources
    where schedule = 'cutoff' and second_cutoff_amount is not null
    on conflict (source_id, position) do nothing;
  end if;
end $$;

alter table expense.income_sources
  drop column if exists expected_amount,
  drop column if exists monthly_day,
  drop column if exists first_cutoff_gross_amount,
  drop column if exists first_cutoff_amount,
  drop column if exists first_cutoff_deductions,
  drop column if exists first_cutoff_day,
  drop column if exists second_cutoff_gross_amount,
  drop column if exists second_cutoff_amount,
  drop column if exists second_cutoff_deductions,
  drop column if exists second_cutoff_day;

create index if not exists income_schedules_source_id_idx on expense.income_schedules(source_id);
alter table expense.income_schedules enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'expense' and tablename = 'income_schedules' and policyname = 'Users manage their own income schedules'
  ) then
    create policy "Users manage their own income schedules" on expense.income_schedules
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on expense.income_schedules to authenticated;
