-- Create interview_slot_students link table
CREATE TABLE IF NOT EXISTS public.interview_slot_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.interview_slots(id) ON DELETE CASCADE,
  student_id_text TEXT NOT NULL REFERENCES public.students(student_id_text) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_id, student_id_text)
);

-- Enable RLS and Policies
ALTER TABLE public.interview_slot_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access to slot_students" ON public.interview_slot_students;
CREATE POLICY "Admin full access to slot_students" ON public.interview_slot_students FOR ALL USING (true) WITH CHECK (true);

-- Migrate existing data from student_id_text in interview_slots
INSERT INTO public.interview_slot_students (slot_id, student_id_text)
SELECT id, student_id_text FROM public.interview_slots
WHERE student_id_text IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop foreign key constraint on the old student_id_text column to allow removal/deprecation later
ALTER TABLE public.interview_slots DROP CONSTRAINT IF EXISTS interview_slots_student_id_text_fkey;
