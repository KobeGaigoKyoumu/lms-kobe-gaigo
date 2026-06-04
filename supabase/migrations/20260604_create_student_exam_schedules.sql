-- Create student_exam_schedules table to store target schools, departments, dates and results.
CREATE TABLE IF NOT EXISTS public.student_exam_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    department_name TEXT, -- 学部・学科・コース
    application_period TEXT,
    exam_date TEXT,
    results_date TEXT,
    status TEXT DEFAULT '結果待ち', -- '合格', '不合格', '結果待ち', '辞退', '未受験'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.student_exam_schedules ENABLE ROW LEVEL SECURITY;

-- Allow all operations for convenience as queries are handled on server side
CREATE POLICY "Allow all operations for student_exam_schedules" 
    ON public.student_exam_schedules 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
