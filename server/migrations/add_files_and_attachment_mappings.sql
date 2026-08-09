-- =============================================================================
-- Migration: Add files table and attachment mapping tables for tickets/comments
-- Run this script on your database before deploying the updated server.
-- =============================================================================

-- 1. Files table — stores raw file binary data
CREATE TABLE IF NOT EXISTS files (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename     TEXT NOT NULL,
    content_type TEXT,
    file_size    BIGINT,
    data         BYTEA NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    created_by   INT REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Tickets → Files mapping table
CREATE TABLE IF NOT EXISTS tickets_to_attachments (
    id         SERIAL PRIMARY KEY,
    ticket_id  INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_id    UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (ticket_id, file_id)
);

-- 3. Ticket Comments → Files mapping table
CREATE TABLE IF NOT EXISTS comments_to_attachments (
    id         SERIAL PRIMARY KEY,
    comment_id INT NOT NULL REFERENCES ticket_comments(id) ON DELETE CASCADE,
    file_id    UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (comment_id, file_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_to_attachments_ticket_id  ON tickets_to_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_to_attachments_file_id    ON tickets_to_attachments(file_id);
CREATE INDEX IF NOT EXISTS idx_comments_to_attachments_comment_id ON comments_to_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_to_attachments_file_id   ON comments_to_attachments(file_id);
CREATE INDEX IF NOT EXISTS idx_files_created_by                  ON files(created_by);
