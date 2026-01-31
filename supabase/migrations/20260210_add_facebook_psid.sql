-- Add facebook_psid to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS facebook_psid TEXT UNIQUE;

-- Index for faster lookups during broadcasting
CREATE INDEX IF NOT EXISTS idx_students_facebook_psid ON students(facebook_psid);
