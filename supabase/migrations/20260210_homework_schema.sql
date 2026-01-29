-- Homework Assignments Table
CREATE TABLE IF NOT EXISTS homework_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    class_name TEXT NOT NULL, -- Target class (e.g., "2-1")
    deadline TIMESTAMPTZ,
    teacher_id UUID REFERENCES auth.users(id), -- Creator
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework Submissions Table
CREATE TABLE IF NOT EXISTS homework_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES homework_assignments(id) ON DELETE CASCADE,
    student_id_text TEXT REFERENCES students(student_id_text) ON DELETE CASCADE,
    comment TEXT,
    file_urls JSONB DEFAULT '[]'::jsonb, -- Array of {name, url} objects
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
    feedback TEXT,
    score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id_text) -- One submission per assignment per student
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_class ON homework_assignments(class_name);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON homework_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON homework_submissions(student_id_text);

-- RLS Policies

-- Enable RLS
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- Assignments Policies
-- Teachers/Admins can do everything
CREATE POLICY "Teachers and Admins can manage assignments"
  ON homework_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Students can view assignments for their class (We need a way to identify student class from session, 
-- but since we are using custom auth, we might bypass RLS for student reads in the server action or 
-- use a public view if strictly needed. For now, we'll allow public read if we can't easily link auth.uid() to student in pure SQL yet,
-- BUT wait, for now let's rely on the Server Action to bypass RLS or use the Service Role for student fetching if needed.
-- ACTUALLY, strict RLS is better. Let's assume we might eventually link them. 
-- For now, let's allow "authenticated" (which includes our teachers) and maybe "anon" if we use client-side fetching?
-- No, we are doing Server Actions. We will use Service Role in Server Actions for student operations to keep it simple 
-- OR strictly checking the cookie in the layout/middleware. 
-- Let's keep RLS simple: Teachers/Admins full access. 
-- We will add a policy for reading if we find a way to verify student identity in SQL, 
-- but given the custom auth (cookie based, not Supabase Auth), Supabase RLS won't know the student identity automatically.
-- So we will rely on Server Actions (Service Role) for student data access.)

-- Submissions Policies
-- Teachers/Admins can view all
CREATE POLICY "Teachers and Admins can view all submissions"
  ON homework_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Teachers/Admins can update (grade)
CREATE POLICY "Teachers and Admins can update submissions"
  ON homework_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

