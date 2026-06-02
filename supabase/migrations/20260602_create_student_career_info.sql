-- Create student_career_info table to store student career questionnaire responses
CREATE TABLE IF NOT EXISTS public.student_career_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    class_name TEXT,
    student_name TEXT,
    filled_at DATE DEFAULT CURRENT_DATE,
    path_type TEXT, -- 進学・就職・帰国・そのほか
    
    -- 進学希望者向け
    first_choice_school TEXT,
    first_choice_reason TEXT,
    first_choice_department TEXT,
    second_choice_school TEXT,
    second_choice_reason TEXT,
    second_choice_department TEXT,
    third_choice_school TEXT,
    third_choice_reason TEXT,
    third_choice_department TEXT,
    
    -- 希望条件
    preferred_field TEXT,
    preferred_region TEXT,
    can_move TEXT, -- 可・不可
    
    -- 確認事項
    tuition_budget TEXT,
    parent_support TEXT, -- 可・不可
    passbook_updated TEXT, -- している・していない
    pay_slips_available TEXT, -- 有・無
    exam_schedule TEXT, -- 受験予定時期
    post_grad_plans TEXT, -- 卒業後の予定
    teacher_questions TEXT, -- 担任に聞きたいこと
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.student_career_info ENABLE ROW LEVEL SECURITY;

-- Allow all operations for convenience (as queries bypass RLS via Service Role Key or are handled on server)
CREATE POLICY "Allow all operations for student_career_info" 
    ON public.student_career_info 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
