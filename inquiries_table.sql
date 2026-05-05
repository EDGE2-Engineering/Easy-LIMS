
-- Create inquiries table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_name text NOT NULL,
  phone_number text,
  email text,
  description text,
  received_at timestamp with time zone DEFAULT now(),
  received_by bigint NOT NULL,
  status text DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'FOLLOWED_UP'::text, 'CONVERTED'::text, 'CLOSED'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inquiries_pkey PRIMARY KEY (id),
  CONSTRAINT inquiries_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Policies for inquiries
-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Allow authenticated users to read inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow authenticated users to insert inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow authenticated users to update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow authenticated users to delete inquiries" ON public.inquiries;

CREATE POLICY "Allow authenticated users to read inquiries" ON public.inquiries 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert inquiries" ON public.inquiries 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update inquiries" ON public.inquiries 
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete inquiries" ON public.inquiries 
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant access to authenticated users
GRANT ALL ON public.inquiries TO authenticated;
GRANT USAGE ON SEQUENCE inquiries_id_seq TO authenticated;
