-- Add telegram_chat_id to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT UNIQUE;

-- Index for faster lookups during broadcasting
CREATE INDEX IF NOT EXISTS idx_students_telegram_chat_id ON students(telegram_chat_id);
