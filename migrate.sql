-- ============================================================
-- MIGRATION: Move departments from DB tables → users.departments
-- Run this against your Supabase database
-- ============================================================

-- Step 1: Add departments JSONB column to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS departments jsonb DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing assignments from users_to_departments
UPDATE public.users u
SET departments = (
    SELECT jsonb_agg(utd.department_id ORDER BY utd.department_id)
    FROM public.users_to_departments utd
    WHERE utd.user_id = u.id
)
WHERE EXISTS (
    SELECT 1 FROM public.users_to_departments utd WHERE utd.user_id = u.id
);

-- Step 3: Drop join table and its policies
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.users_to_departments;
ALTER TABLE IF EXISTS public.users_to_departments DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.users_to_departments;

-- Step 4: Drop departments lookup table
DROP TABLE IF EXISTS public.departments;

-- ============================================================
-- Department ID reference
-- 1 = Chemical Analysis
-- 2 = Physical Testing
-- 3 = Soil Investigation
-- 4 = Non-Destructive Testing (NDT)
-- ============================================================

-- ============================================================
-- MIGRATION: Add employee_id column to users table
-- ============================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS employee_id text UNIQUE;

-- ============================================================
-- MIGRATION: Create employee_leaves table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employee_leaves (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  leave_date date NOT NULL,
  comments text,
  created_by bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_leaves_pkey PRIMARY KEY (id),
  CONSTRAINT employee_leaves_user_date_unique UNIQUE (user_id, leave_date),
  CONSTRAINT employee_leaves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT employee_leaves_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Enable RLS and allow full access via anon key (app uses custom auth, not Supabase Auth)
ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for anon"
ON public.employee_leaves
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
