-- Migration: Fix sampling T&C and Technicals storage
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

-- Option A (recommended): Add columns directly to sampling table
ALTER TABLE public.sampling
  ADD COLUMN IF NOT EXISTS tc_list text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tech_list text[] DEFAULT '{}';

-- Option B (alternative): Fix RLS on junction tables to allow anon writes
-- (Only needed if you want to use the junction table approach instead)
/*
CREATE POLICY "sampling_tc_anon_select" ON public.sampling_to_terms_conditions FOR SELECT USING (true);
CREATE POLICY "sampling_tc_anon_insert" ON public.sampling_to_terms_conditions FOR INSERT WITH CHECK (true);
CREATE POLICY "sampling_tc_anon_delete" ON public.sampling_to_terms_conditions FOR DELETE USING (true);

CREATE POLICY "sampling_tech_anon_select" ON public.sampling_to_technicals FOR SELECT USING (true);
CREATE POLICY "sampling_tech_anon_insert" ON public.sampling_to_technicals FOR INSERT WITH CHECK (true);
CREATE POLICY "sampling_tech_anon_delete" ON public.sampling_to_technicals FOR DELETE USING (true);
*/
