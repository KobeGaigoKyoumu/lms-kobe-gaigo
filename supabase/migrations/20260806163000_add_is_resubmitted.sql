-- Add is_resubmitted column to homework_submissions table
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS is_resubmitted BOOLEAN DEFAULT false;
