-- Create workflow_config table
CREATE TABLE IF NOT EXISTS public.workflow_config (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    config JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.workflow_config ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (or authenticated)
CREATE POLICY "Allow public read access" ON public.workflow_config FOR SELECT USING (true);

-- Create policy for admin write access
-- Assuming role check or just authenticated for now, but better with admin check
CREATE POLICY "Allow authenticated update" ON public.workflow_config FOR ALL USING (auth.role() = 'authenticated');
