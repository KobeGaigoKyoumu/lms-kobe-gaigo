-- Add parent_support_amount column to student_career_info table
ALTER TABLE public.student_career_info 
ADD COLUMN IF NOT EXISTS parent_support_amount TEXT;
