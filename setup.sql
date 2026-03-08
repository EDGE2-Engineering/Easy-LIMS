-- -----------------------------------------------------------------------------
-- Cleanup existing objects
-- -----------------------------------------------------------------------------
drop table if exists public.products cascade;
drop table if exists public.services cascade;
drop table if exists public.tests cascade;
drop table if exists public.clients cascade;
drop table if exists public.app_settings cascade;
drop table if exists public.client_service_prices cascade;
drop table if exists public.client_test_prices cascade;
drop table if exists public.users cascade;
drop table if exists public.accounts cascade;
drop table if exists public.material_samples cascade;
drop table if exists public.material_inward_register cascade;
drop table if exists public.reports cascade;
drop table if exists public.unit_types cascade;
drop table if exists public.service_unit_types cascade;
drop table if exists public.hsn_sac_codes cascade;
drop table if exists public.terms_and_conditions cascade;
drop table if exists public.departments cascade;

-- ================================
-- TABLE CREATION
-- ================================

-- 1. services
create table public.services (
  id text primary key,
  service_type text not null,
  unit text,
  price numeric default 0,
  qty numeric default 1,
  method_of_sampling text default 'NA',
  num_bhs numeric default 0,
  measure text default 'NA',
  hsn_code text default '',
  tc_list text[] default '{}',
  tech_list text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. tests
create table public.tests (
  id text primary key,
  test_type text not null,
  materials text,
  "group" text,
  test_method_specification text,
  num_days numeric default 0,
  price numeric default 0,
  hsn_code text default '',
  tc_list text[] default '{}',
  tech_list text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. clients
create table public.clients (
  id text primary key,
  client_name text not null,
  client_address text default '',
  contacts jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. users
create table public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  full_name text,
  department text,
  role text not null check (role in ('super_admin', 'admin', 'standard')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. app_settings
create table public.app_settings (
  setting_key text primary key,
  setting_value text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. service_unit_types
create table public.service_unit_types (
  id serial primary key,
  unit_type text not null
);

-- 7. hsn_sac_codes
create table public.hsn_sac_codes (
  id serial primary key,
  code text not null,
  description text not null
);

-- 8. terms_and_conditions
create table public.terms_and_conditions (
  id serial primary key,
  text text not null,
  type text not null,
  hsn_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. departments
create table public.departments (
  id serial primary key,
  name text unique not null,
  created_at timestamptz default now()
);

-- 10. client_service_prices
create table public.client_service_prices (
  client_id text references public.clients(id) on delete cascade,
  service_id text references public.services(id) on delete cascade,
  price numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (client_id, service_id)
);

-- 11. client_test_prices
create table public.client_test_prices (
  client_id text references public.clients(id) on delete cascade,
  test_id text references public.tests(id) on delete cascade,
  price numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (client_id, test_id)
);

-- 12. accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  quote_number text unique not null,
  document_type text not null,
  client_name text,
  payment_date date,
  payment_mode text,
  bank_details text,
  content jsonb not null,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 13. material_inward_register
create table public.material_inward_register (
  id uuid primary key default gen_random_uuid(),
  job_order_no varchar(30) unique,
  client_id text not null references public.clients(id) on delete cascade,
  status varchar(30) not null default 'RECEIVED' check (status in (
    'RECEIVED',
    'SENT_TO_TESTING_DEPARTMENT',
    'UNDER_TESTING',
    'TEST_COMPLETED',
    'REPORT_GENERATED',
    'UNDER_REVIEW',
    'SIGNED',
    'PAYMENT_PENDING',
    'PAYMENT_RECEIVED',
    'REPORT_RELEASED',
    'COMPLETED'
  )),
  po_wo_number varchar(50),
  created_by uuid not null references public.users(id) on delete cascade,
  updated_by uuid references public.users(id) on delete cascade,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

-- 14. material_samples
create table public.material_samples (
  id bigserial primary key,
  inward_id uuid not null references public.material_inward_register(id) on delete cascade,
  sample_code varchar(50) not null,
  sample_description text,
  quantity decimal(12,3),
  status varchar(30) default 'RECEIVED',
  received_date date not null,
  received_time time,
  received_by uuid not null references public.users(id) on delete cascade,
  expected_test_days int,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

-- 15. reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_number text unique not null,
  client_name text,
  content jsonb not null,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- ================================
-- RLS SETUP FOR ALL TABLES
-- ================================

alter table public.services enable row level security;
create policy "Services are viewable by everyone" on public.services for select using ( true );
create policy "Allow public management of services" on public.services for all using ( true ) with check ( true );

alter table public.tests enable row level security;
create policy "Tests are viewable by everyone" on public.tests for select using ( true );
create policy "Allow public management of tests" on public.tests for all using ( true ) with check ( true );

alter table public.clients enable row level security;
create policy "Clients are viewable by everyone" on public.clients for select using ( true );
create policy "Allow public management of clients" on public.clients for all using ( true ) with check ( true );

alter table public.app_settings enable row level security;
create policy "Settings are viewable by everyone" on public.app_settings for select using ( true );
create policy "Allow public management of settings" on public.app_settings for all using ( true ) with check ( true );

alter table public.client_service_prices enable row level security;
create policy "Client service prices are viewable by everyone" on public.client_service_prices for select using ( true );
create policy "Allow public management of client service prices" on public.client_service_prices for all using ( true ) with check ( true );

alter table public.client_test_prices enable row level security;
create policy "Client test prices are viewable by everyone" on public.client_test_prices for select using ( true );
create policy "Allow public management of client test prices" on public.client_test_prices for all using ( true ) with check ( true );

alter table public.users enable row level security;
create policy "Users are viewable by everyone" on public.users for select using ( true );
create policy "Allow public management of users" on public.users for all using ( true ) with check ( true );

alter table public.accounts enable row level security;
create policy "Accounts are viewable by everyone" on public.accounts for select using ( true );
create policy "Allow public management of accounts" on public.accounts for all using ( true ) with check ( true );

alter table public.service_unit_types enable row level security;
create policy "Service unit types are viewable by everyone" on public.service_unit_types for select using ( true );
create policy "Allow public management of service unit types" on public.service_unit_types for all using ( true ) with check ( true );

alter table public.hsn_sac_codes enable row level security;
create policy "HSN/SAC codes are viewable by everyone" on public.hsn_sac_codes for select using ( true );
create policy "Allow public management of HSN/SAC codes" on public.hsn_sac_codes for all using ( true ) with check ( true );

alter table public.terms_and_conditions enable row level security;
create policy "Terms and conditions are viewable by everyone" on public.terms_and_conditions for select using ( true );
create policy "Allow public management of terms and conditions" on public.terms_and_conditions for all using ( true ) with check ( true );

alter table public.departments enable row level security;
create policy "Departments are viewable by everyone" on public.departments for select using ( true );
create policy "Allow public management of departments" on public.departments for all using ( true ) with check ( true );

alter table public.material_inward_register enable row level security;
create policy "Material inward register is viewable by everyone" on public.material_inward_register for select using ( true );
create policy "Allow public management of material inward register" on public.material_inward_register for all using ( true ) with check ( true );

alter table public.material_samples enable row level security;
create policy "Material samples are viewable by everyone" on public.material_samples for select using ( true );
create policy "Allow public management of material samples" on public.material_samples for all using ( true ) with check ( true );

alter table public.reports enable row level security;
create policy "Reports are viewable by everyone" on public.reports for select using ( true );
create policy "Allow public management of reports" on public.reports for all using ( true ) with check ( true );
---

-- -----------------------------------------------------------------------------
-- 2. Data Insertion (Sample Data & Configurations)
-- -----------------------------------------------------------------------------

-- 2.1 Sample Services
insert into public.services (id, service_type, unit, price, qty, hsn_code) values
('S1','Mobilization of rig equipment & personnel with all other necessary accessories for carrying out investigations at site and demobilization after completion (Per Rig Per Site Location) including other incidental expenses.','LS',25000,1,'998311'),
('S2','Drilling and Handling (Shifting) Charges from one bore hole to another bore hole.','LS',2000,22,'998312'),
('S3','Boring/ Drilling 100/150mm dia boreholes in all kinds of soil and taking necessary soil samples upto a depth of 10 m.','Per Meter',1200,184,'998313'),
('S4','Boring/ Drilling in refusal strata/ Weathered Rock/ Soft rock using NX size TC bit and taking necessary rock samples as per client scope.','Per Meter',1200,184,'998314'),
('S5','Boring/ Drilling in Hard rock using Diamond bit and taking necessary rock samples as per client scope.','Per Meter',2500,46,'998315'),
('S6','Drilling 10 m to 15 m','Per Meter',500,1,'998316'),
('S7','Drilling 10 m to 15 m','Per Meter',1000,1,'998317'),
('S8','Drilling 15 m to 20 m','Per Meter',1500,1,'998318'),
('S9','Laboratory Tests on soil - Determination of moisture content','Per Bore hole/ Per sample',500,10,'998321'),
('S10','Laboratory Tests on soil - Determination of Specific Gravity','Per Bore hole/ Per sample',500,10,'998322'),
('S11','Laboratory Tests on soil - Grain size Analysis (Sieve and Hydrometer)','Per Bore hole/ Per sample',1500,10,'998323'),
('S12','Laboratory Tests on soil - Determination of Liquid limit and Plastic limit','Per Bore hole/ Per sample',1800,10,'998324'),
('S13','Laboratory Tests on soil - Determination of Shrinkage limit','Per Bore hole/ Per sample',1400,10,'998325'),
('S14','Laboratory Tests on soil - Standard Proctor Compaction Test','Per Bore hole/ Per sample',2000,10,'998326'),
('S15','Laboratory Tests on soil - Swell Pressure and Free Swell Index','Per Bore hole/ Per sample',2000,10,'998327'),
('S16','Laboratory Tests on soil - Lab CBR Test','Per Bore hole/ Per sample',2000,10,'998328'),
('S17','Laboratory Tests on UDS/DS Sample - Bulk Density and Moisture Content','Per Bore hole/ Per sample',500,10,'998331'),
('S18','Laboratory Tests on UDS/DS Sample - Relative Density for sand','Per Bore hole/ Per sample',500,10,'998332'),
('S19','Laboratory Tests on UDS/DS Sample - Unconfined Compression Test','Per Bore hole/ Per sample',1500,10,'998333'),
('S20','Laboratory Tests on UDS/DS Sample - Triaxial Test (UU/CU/CD)','Per Bore hole/ Per sample',1800,10,'998334'),
('S21','Laboratory Tests on UDS/DS Sample - Direct Shear Test','Per Bore hole/ Per sample',1400,10,'998335'),
('S22','Laboratory Tests on UDS/DS Sample - Consolidation Test','Per Bore hole/ Per sample',2000,10,'998336'),
('S23','Laboratory Tests on UDS/DS Sample - Lab Permeability Test','Per Bore hole/ Per sample',2000,11,'998337'),
('S24','Laboratory Tests on Rock Sample - Moisture Content, Porosity and Density','Per Bore hole/ Per sample',500,10,'998341'),
('S25','Laboratory Tests on Rock Sample - Specific gravity','Per Bore hole/ Per sample',500,10,'998342'),
('S26','Laboratory Tests on Rock Sample - Hardness','Per Bore hole/ Per sample',1500,10,'998343'),
('S27','Laboratory Tests on Rock Sample - Slake Durability','Per Bore hole/ Per sample',1800,10,'998344'),
('S28','Laboratory Tests on Rock Sample - Unconfined Compressive Strength (Saturated and In-situ water content)','Per Bore hole/ Per sample',1400,10,'998345'),
('S29','Laboratory Tests on Rock Sample - Point Load Strength','Per Bore hole/ Per sample',2000,10,'998346'),
('S30','Laboratory Tests on Rock Sample - Deformability Test','Per Bore hole/ Per sample',2000,10,'998347'),
('S31','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - pH Value','Per Bore hole/ Per sample',500,10,'998351'),
('S32','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Carbonates','Per Bore hole/ Per sample',500,10,'998352'),
('S33','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Sulphates (SO3 & SO4)','Per Bore hole/ Per sample',1500,10,'998353'),
('S34','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Chlorides','Per Bore hole/ Per sample',1800,10,'998354'),
('S35','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Turbidity and Odour (Only for ground water)','Per Bore hole/ Per sample',2000,10,'998355'),
('S36','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Sulphides','Per Bore hole/ Per sample',2000,10,'998356'),
('S37','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Alkalinity','Per Bore hole/ Per sample',500,10,'998357'),
('S38','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Redox Potential','Per Bore hole/ Per sample',500,10,'998358'),
('S39','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Soluble Salts','Per Bore hole/ Per sample',1500,10,'998359'),
('S40','Laboratory Tests (Chemical) on Subsoil/Groundwater Sample - Organic Matter','Per Bore hole/ Per sample',1800,10,'998361'),
('S41','Electrical Resistivity Test (ERT)','Per Point',15000,3,'998362'),
('S42','Field Permeability Test','Per Point',6000,3,'998363'),
('S43','Field California Bearing Ratio (CBR) Test','Per Point',10000,3,'998364'),
('S44','Dynamic Cone Penetration Test (DCPT)','Per Point',10000,3,'998365'),
('S45','Submission of Geotechnical Investigation report along with recommendations of type and depth of foundations, precautionary measures and recommendations.','LS',25000,1,'998371'),
('S46','Medical, safety and Labour Accommodation and food including any to and fro travel expenses.','LS',25000,1,'998399'),
('S47','Transportation and Mobilization of Hand operated Auger Equipments, SPT Equipments, UDS setup, men to Project Site and withdrawing of the same after completion of all field investigations works.','LS',30000,1,'998372'),
('S48','Boring 150/100mm dia bore holes up to 6.0 m depth in all type of strata or N value >50, whichever is met earlier, including conducting Standard Penetration Test at every 1.00 / 1.50m interval or change of strata whichever are earlier, collecting Undisturbed and disturbed soil samples.','Per Borehole',22000,5,'998373'),
('S49','Conducting the following Laboratory Tests (as per IS codes)','LS',15000,1,'998374'),
('S50','Laboratory Test – Determination of Natural Moisture content as per IS 2720 (Part 2):1973','Included',0,1,'998375'),
('S51','Laboratory Test – Determination of Specific Gravity as per IS 2720 (Part 3/Sec 1):1980','Included',0,1,'998376'),
('S52','Laboratory Test – Determination of Particle Size analysis (Grain size & Hydrometer Method) as per IS 2720 (Part 4):1985','Included',0,1,'998377'),
('S53','Laboratory Test – Determination of Liquid limit and Plastic limit as per IS 2720 (Part 5):1985','Included',0,1,'998378'),
('S54','Laboratory Test – Conducting Direct Shear Tests as per IS 2720 (Part 13):1986','Included',0,1,'998379'),
('S55','Submission of Technical Report with relevant locations regarding SBC of Soil, Type and Depth of Foundations and Improvements to Foundation soil if any.','LS',10000,1,'998381'),
('S56','Mobilization of rig equipment & personnel with all other necessary accessories for carrying out investigations at site and demobilization after completion (Per Rig Per Site Location) including other incidental expenses.','LS',25000,1,'998382'),
('S57','Drilling and Handling (Shifting) Charges from one bore hole to another bore hole.','LS',2000,22,'998383'),
('S58','Boring/ Drilling 100/150mm dia boreholes in all kinds of soil/ refusal strata/ Weathered Rock/ Soft rock using NX size TC bit / 1.0 m in Hard rock using Diamond bit and taking necessary soil/ rock samples upto a depth of 10 m.','Per Meter',3000,184,'998384'),
('S59','Drilling 10 m to 15 m','Per Meter',3500,1,'998385'),
('S60','Drilling 10 m to 15 m','Per Meter',4000,1,'998386'),
('S61','Drilling 15 m to 20 m','Per Meter',4500,1,'998387'),
('S62','Laboratory Tests on soil - Determination of moisture content','Per Bore hole/ Per sample',500,10,'998388'),
('S63','Laboratory Tests on soil - Determination of Specific Gravity','Per Bore hole/ Per sample',500,10,'998389'),
('S64','Laboratory Tests on soil - Grain size Analysis (Sieve and Hydrometer)','Per Bore hole/ Per sample',500,10,'998391'),
('S65','Laboratory Tests on soil - Determination of Liquid limit and Plastic limit','Per Bore hole/ Per sample',500,10,'998392'),
('S66','Laboratory Tests on soil - Determination of Shrinkage limit','Per Bore hole/ Per sample',500,10,'998393'),
('S67','Laboratory Tests on soil - Standard Proctor Compaction Test','Per Bore hole/ Per sample',500,10,'998394'),
('S68','Laboratory Tests on soil - Swell Pressure and Free Swell Index','Per Bore hole/ Per sample',500,10,'998395'),
('S69','Laboratory Tests on soil - Lab CBR Test','Per Bore hole/ Per sample',500,10,'998396'),
('S70','Laboratory Tests on UDS/DS Sample - Bulk Density and Moisture Content','Per Bore hole/ Per sample',500,10,'998397'),
('S71','Laboratory Tests on UDS/DS Sample - Relative Density for sand','Per Bore hole/ Per sample',500,10,'998398'),
('S72','Laboratory Tests on UDS/DS Sample - Unconfined Compression Test','Per Bore hole/ Per sample',500,10,'997311'),
('S73','Laboratory Tests on UDS/DS Sample - Triaxial Test (UU/CU/CD)','Per Bore hole/ Per sample',500,10,'997312'),
('S74','Laboratory Tests on UDS/DS Sample - Direct Shear Test','Per Bore hole/ Per sample',500,10,'997313'),
('S75','Laboratory Tests on UDS/DS Sample - Consolidation Test','Per Bore hole/ Per sample',500,10,'997314'),
('S76','Laboratory Tests on UDS/DS Sample - Lab Permeability Test','Per Bore hole/ Per sample',500,11,'997315'),
('S77','Laboratory Tests on Rock Sample - Moisture Content, Porosity and Density','Per Bore hole/ Per sample',500,10,'997316'),
('S78','Laboratory Tests on Rock Sample - Specific gravity','Per Bore hole/ Per sample',500,10,'997317'),
('S79','Laboratory Tests on Rock Sample - Hardness','Per Bore hole/ Per sample',500,10,'997318'),
('S80','Laboratory Tests on Rock Sample - Slake Durability','Per Bore hole/ Per sample',500,10,'997321'),
('S81','Laboratory Tests on Rock Sample - Unconfined Compressive Strength (Saturated and In-situ water content)','Per Bore hole/ Per sample',500,10,'997322'),
('S82','Laboratory Tests on Rock Sample - Point Load Strength','Per Bore hole/ Per sample',500,10,'997323'),
('S83','Laboratory Tests on Rock Sample - Deformability Test','Per Bore hole/ Per sample',500,10,'997324'),
('S84','Submission of Geotechnical Investigation report along with recommendations of type and depth of foundations, precautionary measures and recommendations.','LS',5000,1,'997325');

-- 2.2 Sample Tests
insert into public.tests 
(id, test_type, materials, "group", test_method_specification, num_days, price, hsn_code) 
values
('T1','Sieve Analysis','Aggregate (Coarse)','Physical','IS 2386 (Part 1)',2,450,'996311'),
('T2','Elongation Index','Aggregate (Coarse)','Physical','IS 2386 (Part 1)',2,300,'996312'),
('T3','Flakiness Index','Aggregate (Coarse)','Physical','IS 2386 (Part 1)',2,300,'996313'),
('T4','Particle Finer Than 75 Micron','Aggregate (Coarse)','Physical','IS 2386 (Part 2)',2,340,'996314'),
('T5','Bulk Density (Loose & Rodded)','Aggregate (Coarse)','Physical','IS 2386 (Part 3)',2,500,'996315'),
('T6','Specific Gravity','Aggregate (Coarse)','Physical','IS 2386 (Part 3)',4,450,'996316'),
('T7','Water Absorption','Aggregate (Coarse)','Physical','IS 2386 (Part 3)',4,400,'996317'),
('T8','10% Fines Value','Aggregate (Coarse)','Physical','IS 2386 (Part 4)',4,500,'996318'),
('T9','Aggregate Crushing Value','Aggregate (Coarse)','Physical','IS 2386 (Part 4)',2,450,'996321'),
('T10','Aggregate Impact Value','Aggregate (Coarse)','Physical','IS 2386 (Part 4)',4,450,'996322'),
('T11','Los Angeles Abrasion Value','Aggregate (Coarse)','Physical','IS 2386 (Part 4)',4,650,'996323'),
('T12','Light Weight Pieces','Aggregate (Coarse)','Chemical','IS 2386 (Part 2)',6,450,'996324'),
('T13','Organic Impurities','Aggregate (Coarse)','Chemical','IS 2386 (Part 2)',6,450,'996325'),
('T14','Alkali Aggregate Reactivity','Aggregate (Coarse)','Chemical','IS 2386 (Part 7)',6,1700,'996326'),
('T15','Chloride','Aggregate (Coarse)','Chemical','EN 1744-1',6,700,'996327'),
('T16','Sulphate','Aggregate (Coarse)','Chemical','EN 1744-1',6,700,'996328'),
('T17','Soundness (Sodium Sulphate)','Aggregate (Coarse)','Chemical','IS 2386 (Part 5)',6,2500,'996331'),
('T18','Sieve Analysis','Aggregate (Fine)','Physical','IS 2386 (Part 1)',2,450,'996332'),
('T19','Particle Finer Than 75 Micron','Aggregate (Fine)','Physical','IS 2386 (Part 2)',2,450,'996333'),
('T20','Bulk Density (Loose & Rodded)','Aggregate (Fine)','Physical','IS 2386 (Part 3)',2,500,'996334'),
('T21','Specific Gravity','Aggregate (Fine)','Physical','IS 2386 (Part 3)',4,450,'996335'),
('T22','Water Absorption','Aggregate (Fine)','Physical','IS 2386 (Part 3)',4,400,'996336'),
('T23','Light Weight Pieces','Aggregate (Fine)','Chemical','IS 2386 (Part 2)',6,450,'996337'),
('T24','Organic Impurities','Aggregate (Fine)','Chemical','IS 2386 (Part 2)',6,450,'996338'),
('T25','Alkali Aggregate Reactivity','Aggregate (Fine)','Chemical','IS 2386 (Part 7)',6,1700,'996341'),
('T26','Chloride','Aggregate (Fine)','Chemical','EN 1744-1',6,700,'996342'),
('T27','Sulphate','Aggregate (Fine)','Chemical','EN 1744-1',6,700,'996343'),
('T28','Soundness (Sodium Sulphate)','Aggregate (Fine)','Chemical','IS 2386 (Part 5)',6,2500,'996344'),
('T29','Compressive Strength','Building Bricks','Physical','IS 3495 (Part 1)',8,250,'996351'),
('T30','Dimensions','Building Bricks','Physical','IS 1077',2,300,'996352'),
('T31','Efflorescence','Building Bricks','Physical','IS 3495 (Part 3)',8,250,'996353'),
('T32','Water Absorption','Building Bricks','Physical','IS 3495 (Part 2)',4,350,'996354'),
('T33','Dimensions','Concrete Blocks','Physical','IS 2185 (Part 1)',2,250,'996361'),
('T34','Block Density','Concrete Blocks','Physical','IS 2185 (Part 1)',3,300,'996362'),
('T35','Drying Shrinkage','Concrete Blocks','Physical','IS 2185 (Part 1)',15,2000,'996363'),
('T36','Moisture Movement','Concrete Blocks','Physical','IS 2185 (Part 1)',15,2000,'996364'),
('T37','Water Absorption','Concrete Blocks','Physical','IS 2185 (Part 1)',4,400,'996365'),
('T38','Compressive Strength','Concrete Blocks','Physical','IS 2185 (Part 1)',3,350,'996366'),
('T39','Compressive Strength','Paver Blocks','Physical','IS 15658',7,350,'996371'),
('T40','Abrasion Resistance','Paver Blocks','Physical','IS 15658',7,600,'996372'),
('T41','Flexural Strength','Paver Blocks','Physical','IS 15658',7,350,'996373'),
('T42','Tensile Splitting Strength','Paver Blocks','Physical','IS 15658',7,450,'996374'),
('T43','Water Absorption','Paver Blocks','Physical','IS 15658',7,400,'996375');

-- 2.3 Sample Clients
insert into public.clients (id, client_name, client_address, contacts) values
('C1','Indus Towers Ltd.','No.12, Subramanya Arcade, ''D'' Block, 7th Floor, Bannerghatta Road, Bengaluru.','[{"contact_person": "", "contact_email": "indus@email.com", "contact_phone": "123", "is_primary": true}]'::jsonb),
('C2','Reliance Jio Infocomm Ltd.','Bengaluru, Karnataka','[{"contact_person": "", "contact_email": "jio@email.com", "contact_phone": "456", "is_primary": true}]'::jsonb),
('C3','ATC Telecom Infrastructure Pvt. Ltd.','HM Tower, 1st Floor, Magrath Road Junction, Brigade Road, Ashok Nagar, Bengaluru - 560001, Karnataka, INDIA','[{"contact_person": "", "contact_email": "atc@email.com", "contact_phone": "789", "is_primary": true}]'::jsonb);

-- 2.4 Sample Users
insert into public.users (username, password, full_name, role, is_active) values
('admin', 'admin123', 'Administrator', 'admin', true),
('user', 'user123', 'Standard User', 'standard', true),
('test', 'test123', 'Test User', 'standard', false)
on conflict (username) do nothing;

-- 2.5 Unit Types
INSERT INTO public.service_unit_types (unit_type) VALUES
('Per Point'),('Per Bore hole'),('Included'),('Per Test'),('Per Location'),('Per Day'),('LS'),('Per Meter'),('Per Bore hole / Per sample');

-- 2.6 HSN/SAC Codes
INSERT INTO public.hsn_sac_codes (code, description) VALUES
('998346', 'General testing and analysis'),
('995432', 'Construction-related site testing services');

-- 2.7 App Settings
insert into public.app_settings (setting_key, setting_value, description) values
('tax_cgst', '9', 'CGST Percentage'),
('tax_sgst', '9', 'SGST Percentage')
ON CONFLICT (setting_key) DO NOTHING;

-- 2.8 Departments
INSERT INTO public.departments (name) VALUES
('Sales'),('Engineering'),('HR'),('Logistics');

-- 2.9 Terms and Conditions
INSERT INTO public.terms_and_conditions (text, type, hsn_code) VALUES
(
'1. A minimum of Twenty (20) samples is required for testing. The Company reserves the right to reject or withhold testing of any samples that do not meet this minimum sample requirement.
2. The Client must clearly mention the Brand and Type of Brick at the time of submitting samples. The Company shall not be responsible for any errors, delays, or discrepancies in test results arising due to failure to provide proper details in advance.
3. The minimum number of days required for the test is 4–5 days.
4. Billing will be made based on the actual quantity involved in testing.
5. The above quotation is valid for 15 days from the date of submission.
6. Rates given above will be subject to applicable taxes.
7. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
8. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Bricks', '998346'
),
(
'1. A minimum of 20 kg of samples is required for testing. The Company reserves the right to reject or withhold testing of any quantity that does not meet this minimum sample requirement.
2. The Client must clearly mention the Brand and Grade at the time of submitting samples. The Company shall not be responsible for any errors, delays, or discrepancies in test results arising due to failure to provide proper details in advance.
3. The minimum number of days required for the test is 28 days (the preliminary report can be submitted on the 7th day).
4. Billing will be made based on the actual quantity involved in testing.
5. The above quotation is valid for 15 days from the date of submission.
6. Rates given above will be subject to applicable taxes.
7. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
8. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Cement & GGBS', '998346'
),
(
'1. A minimum of 30 kg of sample is required for testing. The Company reserves the right to reject or withhold testing of any sample that does not meet this minimum sample requirement.
2. The Client must clearly mention the Grade at the time of submitting samples. The Company shall not be responsible for any errors, delays, or discrepancies in test results arising due to failure to provide proper details in advance.
3. The minimum number of days required for the test is 5–6 days.
4. Billing will be made based on the actual quantity involved in testing.
5. The above quotation is valid for 15 days from the date of submission.
6. Rates given above will be subject to applicable taxes.
7. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
8. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Granular Sub Base (GSB)', '998346'
),
(
'1. A minimum of Ten (10) samples is required for testing. The Company reserves the right to reject or withhold testing of any set that does not meet this minimum sample requirement.
2. The minimum number of days required for the test is 5–6 days.
3. Billing will be made based on the actual number of sets involved in testing.
4. The above quotation is valid for 15 days from the date of submission.
5. Rates given above will be subject to applicable taxes.
6. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
7. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'AAC/ACC Block', '998346'
),
(
'1. A minimum of 30 kg of sample is required for testing. The Company reserves the right to reject or withhold testing of any sample that does not meet this minimum sample requirement.
2. The minimum number of days required for the test is 5–6 days.
3. Billing will be made based on the actual quantity involved in testing.
4. The above quotation is valid for 15 days from the date of submission.
5. Rates given above will be subject to applicable taxes.
6. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
7. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'WET MIX MACADAM (WMM)', '998346'
),
(
'1. A minimum of Three (3) samples is required for each diameter for testing. The Company reserves the right to reject or withhold testing of any set that does not meet this minimum sample requirement.
2. The Client must clearly mention the Brand and Grade at the time of submitting samples. The Company shall not be responsible for any errors, delays, or discrepancies in test results arising due to failure to provide proper details in advance.
3. The minimum number of days required for the test is 2 days.
4. Billing will be made based on the actual number of diameters involved in testing.
5. The above quotation is valid for 15 days from the date of submission.
6. Rates given above will be subject to applicable taxes.
7. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
8. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Steel Testing', '998346'
),
(
'1. A minimum of Fourteen (14) samples is required for testing. The Company reserves the right to reject or withhold testing of any set that does not meet this minimum sample requirement.
2. The minimum number of days required for the test is 4–5 days.
3. Billing will be made based on the actual number of sets involved in testing.
4. The above quotation is valid for 15 days from the date of submission.
5. Rates given above will be subject to applicable taxes.
6. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
7. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Solid Block', '998346'
),
(
'1. A minimum of Three (3) samples is required for each set for testing. The Company reserves the right to reject or withhold testing of any set that does not meet this minimum sample requirement.
2. The Client must clearly mention the grade of concrete at the time of submitting samples. The Company shall not be responsible for any errors, delays, or discrepancies in test results arising due to failure to provide proper details in advance.
3. The minimum number of days required for the test is 4–5 days.
4. Billing will be made based on the actual number of sets involved in testing.
5. The above quotation is valid for 15 days from the date of submission.
6. Rates given above will be subject to applicable taxes.
7. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
8. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Concrete Core', '998346'
),
(
'1. A minimum of Three (3) samples is required for each testing. The Company reserves the right to reject or withhold testing of any set that does not meet this minimum sample requirement.
2. The Client must clearly mention the grade of concrete at the time of submitting samples. The Company shall not be responsible for any errors, delays, or discrepancies in test results arising due to failure to provide proper details in advance.
3. The minimum number of days required for the test is 3–4 days.
4. Billing will be made based on the actual number of sets involved in testing.
5. The above quotation is valid for 15 days from the date of submission.
6. Rates given above will be subject to applicable taxes.
7. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
8. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Paver Blocks', '998346'
),
(
'1. A minimum of 10 kg of sample is required for testing. The Company reserves the right to reject or withhold testing of any sample that does not meet this minimum sample requirement.
2. The minimum number of days required for the test is 4–5 days.
3. Billing will be made based on the actual quantity involved in testing.
4. The above quotation is valid for 15 days from the date of submission.
5. Rates given above will be subject to applicable taxes.
6. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
7. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Fine Aggregate', '998346'
),
(
'1. A minimum of Three (3) samples is required for each set for testing. The Company reserves the right to reject or withhold testing of any set that does not meet this minimum sample requirement.
2. The Client must clearly mention the exact date of casting and grade of concrete at the time of submitting samples. The Company shall not be responsible for any errors, delays, or discrepancies in test results arising due to failure to provide proper details in advance.
3. The minimum number of days required for the test is 2 days.
4. Billing will be made based on the actual number of sets involved in testing.
5. The above quotation into valid for 15 days from the date of submission.
6. Rates given above will be subject to applicable taxes.
7. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
8. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Concrete Cube / ACT Cube', '998346'
),
(
'1. A minimum of 30 kg of sample is required for testing. The Company reserves the right to reject or withhold testing of any sample that does not meet this minimum sample requirement.
2. The minimum number of days required for the test is 5–6 days.
3. Billing will be made based on the actual quantity involved in testing.
4. The above quotation is valid for 15 days from the date of submission.
5. Rates given above will be subject to applicable taxes.
6. Any quantities exceeding the quantities mentioned above will be subject to additional charges.
7. The rates quoted in this offer are valid only for the specified scope of quotation. If there is any reduction in quantity, the rates are subject to increase accordingly and the present quotation stands invalid.',
'Coarse Aggregate', '998346'
);

-- Final Updates
update public.services set hsn_code = '995432' where hsn_code = '';
update public.tests set hsn_code = '998346' where hsn_code = '';