-- Drop old table if exists
drop table if exists public.employee_wages cascade;

-- Create employee_attendance table
create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  month integer not null,
  year integer not null,
  total_working_days numeric not null,
  days_worked numeric not null,
  calculated_wage numeric not null, -- Store calculated value for historical record
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, month, year)
);

-- Enable RLS
alter table public.employee_attendance enable row level security;
create policy "Allow all for authenticated users" on public.employee_attendance for all using ( true ) with check ( true );
