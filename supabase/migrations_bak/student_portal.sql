-- Migration: Add student portal support
-- Description: Add student_id_text to profiles and create necessary policies

-- 1. Add student_id_text column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS student_id_text TEXT;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_student_id 
ON public.profiles(student_id_text);

-- 3. RLS Policy: Students can read their own profile
DROP POLICY IF EXISTS "student_read_own_profile" ON public.profiles;
CREATE POLICY "student_read_own_profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
);

-- 4. RLS Policy: Students can view their own grade records
DROP POLICY IF EXISTS "student_view_own_grades" ON public.grade_records;
CREATE POLICY "student_view_own_grades"
ON public.grade_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.student_id_text = grade_records.student_id_text
  )
);

-- 5. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_records ENABLE ROW LEVEL SECURITY;
