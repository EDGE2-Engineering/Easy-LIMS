-- Run this if you already created the sampling table
ALTER TABLE public.sampling 
ALTER COLUMN materials TYPE TEXT[] 
USING (CASE WHEN materials IS NULL OR materials = '' THEN '{}'::TEXT[] ELSE ARRAY[materials] END);
ALTER TABLE public.sampling ALTER COLUMN materials SET DEFAULT '{}';
