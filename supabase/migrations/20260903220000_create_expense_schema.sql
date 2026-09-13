create schema if not exists expense;

grant usage on schema expense to authenticated, service_role;

create table expense.finance_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_month text not null,
  setup_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table expense.income_sources (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('allowance', 'salary', 'business', 'freelance', 'bonus', 'other')),
  mode text not null check (mode in ('recurring', 'manual')),
  schedule text not null check (schedule in ('monthly', 'cutoff', 'irregular')),
  start_month text,
  end_month text,
  next_expected_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table expense.income_schedules (
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

create table expense.monthly_bills (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  expected_amount numeric not null check (expected_amount >= 0),
  due_day integer not null check (due_day between 1 and 31),
  tag_id text not null,
  cutoff text check (cutoff in ('first', 'second')),
  start_month text,
  end_month text,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table expense.income_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text,
  title text not null,
  amount numeric not null check (amount >= 0),
  date date not null,
  kind text not null check (kind in ('source', 'one_time')),
  category text check (category in ('allowance', 'salary', 'business', 'freelance', 'bonus', 'other')),
  cutoff text check (cutoff in ('first', 'second')),
  is_generated boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  foreign key (source_id, user_id) references expense.income_sources(id, user_id) on delete set null (source_id)
);

create table expense.expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric not null check (amount >= 0),
  date date not null,
  tag_id text not null,
  bill_id text,
  cutoff text check (cutoff in ('first', 'second')),
  is_generated boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  foreign key (bill_id, user_id) references expense.monthly_bills(id, user_id) on delete set null (bill_id)
);

create table expense.savings_snapshots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  income numeric not null,
  expenses numeric not null,
  savings numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create index income_sources_user_id_idx on expense.income_sources(user_id);
create index income_schedules_source_id_idx on expense.income_schedules(source_id);
create index income_entries_user_date_idx on expense.income_entries(user_id, date desc);
create index monthly_bills_user_id_idx on expense.monthly_bills(user_id);
create index expenses_user_date_idx on expense.expenses(user_id, date desc);
create index savings_snapshots_user_month_idx on expense.savings_snapshots(user_id, month);

alter table expense.finance_profiles enable row level security;
alter table expense.income_sources enable row level security;
alter table expense.income_schedules enable row level security;
alter table expense.income_entries enable row level security;
alter table expense.monthly_bills enable row level security;
alter table expense.expenses enable row level security;
alter table expense.savings_snapshots enable row level security;

create policy "Users manage their own profile" on expense.finance_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own income sources" on expense.income_sources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own income schedules" on expense.income_schedules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own income entries" on expense.income_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own monthly bills" on expense.monthly_bills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own expenses" on expense.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own savings snapshots" on expense.savings_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on expense.finance_profiles to authenticated;
grant select, insert, update, delete on expense.income_sources to authenticated;
grant select, insert, update, delete on expense.income_schedules to authenticated;
grant select, insert, update, delete on expense.income_entries to authenticated;
grant select, insert, update, delete on expense.monthly_bills to authenticated;
grant select, insert, update, delete on expense.expenses to authenticated;
grant select, insert, update, delete on expense.savings_snapshots to authenticated;
