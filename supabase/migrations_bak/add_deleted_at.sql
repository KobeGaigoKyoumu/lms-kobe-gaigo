-- Add deleted_at column for soft delete support
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Make checks to ensure soft delete works as expected
COMMENT ON COLUMN messages.deleted_at IS 'Timestamp when the message was soft-deleted';
