-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_settings (
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.client_service_prices (
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  client_id bigint NOT NULL,
  service_id bigint NOT NULL,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT client_service_prices_pkey PRIMARY KEY (id),
  CONSTRAINT client_service_prices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_service_prices_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.client_test_prices (
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  client_id bigint NOT NULL,
  test_id bigint NOT NULL,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT client_test_prices_pkey PRIMARY KEY (id),
  CONSTRAINT client_test_prices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_test_prices_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id)
);
CREATE TABLE public.clients (
  client_name text NOT NULL,
  client_address text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  contacts jsonb DEFAULT '[]'::jsonb,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.collection_centers (
  name text NOT NULL,
  address text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT collection_centers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.company_calendar (
  event_date date NOT NULL UNIQUE,
  event_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_holiday boolean DEFAULT true,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT company_calendar_pkey PRIMARY KEY (id)
);
CREATE TABLE public.documents (
  quote_number text NOT NULL UNIQUE,
  document_type text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  payment_date date,
  payment_mode text,
  bank_details text,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_by bigint NOT NULL,
  client_id bigint NOT NULL,
  job_id bigint NOT NULL,
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT saved_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT accounts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT accounts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.expenses (
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  remarks text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_by bigint NOT NULL,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.hsn_sac_codes (
  code text NOT NULL,
  description text NOT NULL,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT hsn_sac_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.job_tests (
  category text NOT NULL,
  status text DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'VERIFIED'::text])),
  results jsonb DEFAULT '{}'::jsonb,
  remarks text,
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  job_id bigint NOT NULL,
  assigned_technician_id bigint NOT NULL,
  CONSTRAINT job_tests_pkey PRIMARY KEY (id),
  CONSTRAINT job_tests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_tests_assigned_technician_id_fkey FOREIGN KEY (assigned_technician_id) REFERENCES public.users(id)
);
CREATE TABLE public.job_to_technicians (
  job_id bigint NOT NULL,
  technician_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_to_technicians_pkey PRIMARY KEY (job_id, technician_id),
  CONSTRAINT job_to_technicians_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_to_technicians_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.users(id)
);
CREATE TABLE public.job_workflow_logs (
  from_state text,
  to_state text NOT NULL,
  action_id text,
  remarks text,
  created_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  job_id bigint NOT NULL,
  performed_by bigint NOT NULL,
  CONSTRAINT job_workflow_logs_pkey PRIMARY KEY (id),
  CONSTRAINT job_workflow_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_workflow_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id)
);
CREATE TABLE public.jobs (
  job_code text UNIQUE,
  project_name text NOT NULL,
  project_address text,
  status text NOT NULL DEFAULT 'JOB_CREATED'::text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  test_types jsonb DEFAULT '{}'::jsonb,
  work_order_id text,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id bigint NOT NULL,
  created_by bigint NOT NULL,
  updated_by bigint NOT NULL,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT jobs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);
CREATE TABLE public.material_inward_register (
  job_order_no character varying UNIQUE,
  status character varying NOT NULL DEFAULT 'RECEIVED'::character varying CHECK (status::text = ANY (ARRAY['RECEIVED'::character varying, 'UIN_GENERATED'::character varying, 'SENT_TO_DEPARTMENT'::character varying, 'UNDER_TESTING'::character varying, 'TEST_COMPLETED'::character varying, 'REPORT_GENERATED'::character varying, 'UNDER_REVIEW'::character varying, 'SIGNED'::character varying, 'PAYMENT_PENDING'::character varying, 'PAYMENT_RECEIVED'::character varying, 'REPORT_RELEASED'::character varying, 'COMPLETED'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  po_wo_number character varying,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id bigint NOT NULL,
  created_by bigint NOT NULL,
  updated_by bigint NOT NULL,
  job_id bigint NOT NULL,
  CONSTRAINT material_inward_register_pkey PRIMARY KEY (id),
  CONSTRAINT material_inward_register_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT material_inward_register_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT material_inward_register_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT material_inward_register_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.material_samples (
  sample_code character varying NOT NULL,
  sample_description text,
  quantity numeric,
  status character varying DEFAULT 'RECEIVED'::character varying,
  received_date date NOT NULL,
  received_time time without time zone,
  expected_test_days integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  inward_id bigint NOT NULL,
  received_by bigint NOT NULL,
  collection_center_id bigint NOT NULL,
  material_type text,
  CONSTRAINT material_samples_pkey PRIMARY KEY (id),
  CONSTRAINT material_samples_inward_id_fkey FOREIGN KEY (inward_id) REFERENCES public.material_inward_register(id),
  CONSTRAINT material_samples_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id),
  CONSTRAINT material_samples_collection_center_id_fkey FOREIGN KEY (collection_center_id) REFERENCES public.collection_centers(id)
);
CREATE TABLE public.reports (
  report_number text NOT NULL UNIQUE,
  content jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id bigint NOT NULL,
  created_by bigint NOT NULL,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.request_approvals (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  request_type text NOT NULL,
  requester_id bigint NOT NULL,
  request_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])),
  admin_remarks text,
  reviewed_by bigint,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT request_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT request_approvals_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id),
  CONSTRAINT request_approvals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.sampling (
  service_type text NOT NULL,
  test_type text,
  group text,
  test_method_specification text,
  unit text,
  qty numeric DEFAULT 1,
  price numeric DEFAULT 0,
  hsn_code text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT sampling_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sampling_to_materials (
  sampling_id bigint NOT NULL,
  material_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sampling_to_materials_pkey PRIMARY KEY (sampling_id, material_id),
  CONSTRAINT sampling_to_materials_sampling_id_fkey FOREIGN KEY (sampling_id) REFERENCES public.sampling(id)
);
CREATE TABLE public.sampling_to_technicals (
  sampling_id bigint NOT NULL,
  technical_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sampling_to_technicals_pkey PRIMARY KEY (sampling_id, technical_id),
  CONSTRAINT sampling_to_technicals_sampling_id_fkey FOREIGN KEY (sampling_id) REFERENCES public.sampling(id),
  CONSTRAINT sampling_to_technicals_technical_id_fkey FOREIGN KEY (technical_id) REFERENCES public.technicals(id)
);
CREATE TABLE public.sampling_to_terms_conditions (
  sampling_id bigint NOT NULL,
  tc_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sampling_to_terms_conditions_pkey PRIMARY KEY (sampling_id, tc_id),
  CONSTRAINT sampling_to_terms_conditions_sampling_id_fkey FOREIGN KEY (sampling_id) REFERENCES public.sampling(id),
  CONSTRAINT sampling_to_terms_conditions_tc_id_fkey FOREIGN KEY (tc_id) REFERENCES public.terms_and_conditions(id)
);
CREATE TABLE public.service_to_technicals (
  service_id bigint NOT NULL,
  technical_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_to_technicals_pkey PRIMARY KEY (service_id, technical_id),
  CONSTRAINT service_to_technicals_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT service_to_technicals_technical_id_fkey FOREIGN KEY (technical_id) REFERENCES public.technicals(id)
);
CREATE TABLE public.service_to_terms_conditions (
  service_id bigint NOT NULL,
  tc_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_to_terms_conditions_pkey PRIMARY KEY (service_id, tc_id),
  CONSTRAINT service_to_terms_conditions_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT service_to_terms_conditions_tc_id_fkey FOREIGN KEY (tc_id) REFERENCES public.terms_and_conditions(id)
);
CREATE TABLE public.service_unit_types (
  unit_type text NOT NULL,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT service_unit_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.services (
  service_type text NOT NULL,
  unit text,
  price numeric DEFAULT 0,
  qty numeric DEFAULT 1,
  method_of_sampling text DEFAULT 'NA'::text,
  num_bhs numeric DEFAULT 0,
  measure text DEFAULT 'NA'::text,
  hsn_code text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.technicals (
  text text NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT technicals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.technician_capabilities (
  category text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  CONSTRAINT technician_capabilities_pkey PRIMARY KEY (id),
  CONSTRAINT technician_capabilities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.terms_and_conditions (
  text text NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT terms_and_conditions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.test_to_technicals (
  test_id bigint NOT NULL,
  technical_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT test_to_technicals_pkey PRIMARY KEY (test_id, technical_id),
  CONSTRAINT test_to_technicals_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id),
  CONSTRAINT test_to_technicals_technical_id_fkey FOREIGN KEY (technical_id) REFERENCES public.technicals(id)
);
CREATE TABLE public.test_to_terms_conditions (
  test_id bigint NOT NULL,
  tc_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT test_to_terms_conditions_pkey PRIMARY KEY (test_id, tc_id),
  CONSTRAINT test_to_terms_conditions_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id),
  CONSTRAINT test_to_terms_conditions_tc_id_fkey FOREIGN KEY (tc_id) REFERENCES public.terms_and_conditions(id)
);
CREATE TABLE public.tests (
  test_type text NOT NULL,
  materials text,
  group text,
  test_method_specification text,
  num_days numeric DEFAULT 0,
  price numeric DEFAULT 0,
  hsn_code text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT tests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  full_name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  base_salary numeric DEFAULT 0,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  role text NOT NULL,
  departments ARRAY DEFAULT '{}'::jsonb[],
  employee_id text NOT NULL UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);