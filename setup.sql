-- =============================================================================
-- Easy-LIMS Database Setup Script
-- =============================================================================
-- This script sets up required auxiliary tables, columns, indexes, and initial
-- seed records for the Easy-LIMS application.
--
-- Usage:
--   Option 1: make db-setup
--   Option 2: python3 scripts/apply_sql.py setup.sql
--   Option 3: psql "<DATABASE_URL>" -f setup.sql
--   Option 4: Run directly in your PostgreSQL / Supabase SQL Editor
-- =============================================================================

-- 1. Job Tests Table & Indexes
CREATE TABLE IF NOT EXISTS job_tests (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    results JSONB,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    assigned_technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE job_tests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_job_tests_job_id ON job_tests(job_id);

-- 2. Technician Capabilities Table & Indexes
CREATE TABLE IF NOT EXISTS technician_capabilities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_technician_capabilities_user_id ON technician_capabilities(user_id);

-- 3. Vendors & Suppliers Table & Indexes
CREATE TABLE IF NOT EXISTS vendors_suppliers (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'Vendor',
    name TEXT NOT NULL,
    address TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    category TEXT,
    contacts JSONB,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendors_suppliers_type ON vendors_suppliers(type);

-- 4. Job to Technicians Mapping Table & Indexes
CREATE TABLE IF NOT EXISTS job_to_technicians (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    technician_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_tests TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE job_to_technicians ADD COLUMN IF NOT EXISTS assigned_tests TEXT;
CREATE INDEX IF NOT EXISTS idx_job_to_technicians_job_id ON job_to_technicians(job_id);
CREATE INDEX IF NOT EXISTS idx_job_to_technicians_technician_id ON job_to_technicians(technician_id);

-- 5. Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    recipients JSONB NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sent_by_name TEXT,
    status TEXT NOT NULL DEFAULT 'SENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- 6. Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Seed Default Email Templates (Idempotent)
INSERT INTO email_templates (name, subject, body)
SELECT 
    'Test Report Released Notice',
    'Laboratory Test Report Available - {{client_name}}',
    '<h2>Laboratory Test Report Dispatch</h2><p>Dear <strong>{{contact_person}}</strong>,</p><p>We are pleased to inform you that the requested laboratory testing for your recent job sample has been completed and verified by our quality engineers.</p><p>You can access your verified report directly through your client portal or by contacting your account representative.</p><hr /><p>Best regards,<br /><strong>{{site_name}} Quality Laboratory Team</strong></p>'
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'Test Report Released Notice');

INSERT INTO email_templates (name, subject, body)
SELECT 
    'Work Order & Sample Receipt Confirmation',
    'Work Order & Sample Receipt Confirmation - {{client_name}}',
    '<h2>Sample Reception & Work Order Confirmation</h2><p>Dear <strong>{{contact_person}}</strong>,</p><p>Thank you for choosing <strong>{{site_name}}</strong>. We have officially logged your work order and material samples into our LIMS testing workflow.</p><p>Our technicians have begun sample preparation and testing per the required standards.</p><hr /><p>Regards,<br /><strong>Material Receiving Department</strong></p>'
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'Work Order & Sample Receipt Confirmation');

INSERT INTO email_templates (name, subject, body)
SELECT 
    'General Communication Notice',
    'Important Update from {{site_name}}',
    '<h2>Important Customer Update</h2><p>Dear Valued Partner,</p><p>We are writing to share an important announcement regarding our laboratory operations and technical testing services.</p><p>Please review the details below and reach out to our support team if you have any questions.</p><hr /><p>Sincerely,<br /><strong>Management Team - {{site_name}}</strong></p>'
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'General Communication Notice');
