-- -----------------------------------------------------------------------------
-- Create Table: technicals
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.technicals (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table public.technicals enable row level security;

-- Policies
drop policy if exists "Technicals are viewable by everyone" on public.technicals;
create policy "Technicals are viewable by everyone"
  on public.technicals for select
  using ( true );

drop policy if exists "Allow public management of technicals" on public.technicals;
create policy "Allow public management of technicals"
  on public.technicals for all
  using ( true )
  with check ( true );

-- Sample Data (Optional, mirroring current hardcoded sections)
INSERT INTO public.technicals (type, text) VALUES 
('Investigation', 'The investigation work consisted of drilling 100/150mm diameter bore holes to required depth. The drilling was carried out using rig equipments, SPT equipments, UDS setup etc. Standard Penetration Tests (SPT) were conducted at regular intervals as per IS 2131.'),
('Laboratory Tests', 'Laboratory tests were conducted on soil and rock samples collected from the bore holes. Tests include Natural Moisture Content, Specific Gravity, Grain Size Analysis, Atterberg Limits, Direct Shear Test, etc., as per relevant IS codes.');
