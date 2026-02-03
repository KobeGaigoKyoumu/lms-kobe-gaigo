-- Add reply_to_id column for Reply feature
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id);

-- Optional: Index for performance if needed (though usually we fetch by ID)
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
