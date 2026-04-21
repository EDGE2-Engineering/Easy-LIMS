-- Create sampling table
CREATE TABLE IF NOT EXISTS public.sampling (
    id TEXT NOT NULL,

    -- Core types
    service_type TEXT NOT NULL,

    -- Descriptive fields
    materials TEXT[] DEFAULT '{}',
    "group" TEXT,
    test_method_specification TEXT,

    -- Measurement / service details
    unit TEXT,
    qty NUMERIC DEFAULT 1,

    -- Pricing / codes
    price NUMERIC DEFAULT 0,
    hsn_code TEXT DEFAULT '',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Arrays
    tc_list TEXT[] DEFAULT '{}',
    tech_list TEXT[] DEFAULT '{}',

    CONSTRAINT sampling_pkey PRIMARY KEY (id)
)
TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.sampling ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching existing patterns in setup.sql)
CREATE POLICY "Sampling are viewable by everyone" ON public.sampling FOR SELECT USING (true);
CREATE POLICY "Allow public management of sampling" ON public.sampling FOR ALL USING (true) WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS sampling_id_idx ON public.sampling (id);
