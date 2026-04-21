-- -----------------------------------------------------------------------------
-- Create Table: materials
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.materials (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table public.materials enable row level security;

-- Policies
drop policy if exists "Materials are viewable by everyone" on public.materials;
create policy "Materials are viewable by everyone"
  on public.materials for select
  using ( true );

drop policy if exists "Allow public management of materials" on public.materials;
create policy "Allow public management of materials"
  on public.materials for all
  using ( true )
  with check ( true );

-- Sample Data
INSERT INTO public.materials (name) VALUES 
('Aggregate (Coarse)'),
('Aggregate (Fine)'),
('Cement'),
('Concrete'),
('Soil'),
('Rock'),
('Bitumen'),
('Steel'),
('Water'),
('Tiles'),
('Bricks')
ON CONFLICT (name) DO NOTHING;
