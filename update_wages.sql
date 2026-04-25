-- Create employee_wages table
create table if not exists public.employee_wages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  month integer not null,
  year integer not null,
  salary numeric not null,
  total_working_days numeric not null,
  days_worked numeric not null,
  calculated_wage numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, month, year)
);

-- Enable RLS
alter table public.employee_wages enable row level security;
create policy "Allow all for authenticated users" on public.employee_wages for all using ( true ) with check ( true );

-- Add base_salary to users table if not exists
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='base_salary') then
    alter table public.users add column base_salary numeric default 0;
  end if;
end $$;
