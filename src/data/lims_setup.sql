
-- 1. Migrate existing roles to new roles system before applying constraint
-- Important: First drop existing constraints to allow migrating data to 'technician'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE public.users SET role = 'admin' WHERE role = 'super_admin';
UPDATE public.users SET role = 'technician' WHERE role = 'standard';

-- 1b. Update roles check constraint
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'accounts', 'mro', 'technician', 'senior_analyst'));

-- 2. Migrate existing job statuses to new workflow constants
UPDATE public.jobs SET status = 'JOB_CREATED' WHERE status ILIKE 'Job Created' OR status IS NULL;
UPDATE public.jobs SET status = 'MATERIAL_RECEIVED' WHERE status ILIKE 'Material Received';
UPDATE public.jobs SET status = 'UNDER_TESTING' WHERE status ILIKE 'Start Testing' OR status ILIKE 'Under Testing';
UPDATE public.jobs SET status = 'TESTING_COMPLETE' WHERE status ILIKE 'Testing Completed';
UPDATE public.jobs SET status = 'REPORT_GENERATED' WHERE status ILIKE 'Report Uploaded' OR status ILIKE 'Report Generated';

-- 2b. Create job_workflow_logs for audit trail
CREATE TABLE IF NOT EXISTS public.job_workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    from_state TEXT,
    to_state TEXT NOT NULL,
    action_id TEXT,
    performed_by UUID REFERENCES public.users(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create technician_capabilities (for assigning tests)
CREATE TABLE IF NOT EXISTS public.technician_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g., 'Soil Testing'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, category)
);

-- 4. Create job_tests table to track modular testing
CREATE TABLE IF NOT EXISTS public.job_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    assigned_technician_id UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED')),
    results JSONB DEFAULT '{}', -- stores actual test data points aggregated by category
    remarks TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(job_id, category)
);

-- 5. Enable RLS on new tables
ALTER TABLE public.job_workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tests ENABLE ROW LEVEL SECURITY;

-- 6. Generic policies (can be refined later)
DROP POLICY IF EXISTS "logs_viewable_by_all" ON public.job_workflow_logs;
CREATE POLICY "logs_viewable_by_all" ON public.job_workflow_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "capabilities_viewable_by_all" ON public.technician_capabilities;
CREATE POLICY "capabilities_viewable_by_all" ON public.technician_capabilities FOR SELECT USING (true);
DROP POLICY IF EXISTS "job_tests_viewable_by_all" ON public.job_tests;
CREATE POLICY "job_tests_viewable_by_all" ON public.job_tests FOR SELECT USING (true);

-- Allow all for now (matching existing pattern in setup.sql)
DROP POLICY IF EXISTS "allow_all_logs" ON public.job_workflow_logs;
CREATE POLICY "allow_all_logs" ON public.job_workflow_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_capabilities" ON public.technician_capabilities;
CREATE POLICY "allow_all_capabilities" ON public.technician_capabilities FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_job_tests" ON public.job_tests;
CREATE POLICY "allow_all_job_tests" ON public.job_tests FOR ALL USING (true) WITH CHECK (true);

-- 7. Constraints fix and Default admin user seed
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);

INSERT INTO public.users (username, password, full_name, role, is_active)
VALUES ('admin', 'Omkara@123!#', 'System Admin', 'admin', true)
ON CONFLICT (username) DO UPDATE 
SET role = 'admin', is_active = true, password = 'Omkara@123!#';
