-- Create student_exam_surveys table to store student entrance examination survey responses
CREATE TABLE IF NOT EXISTS public.student_exam_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    class_name TEXT,
    student_name TEXT,
    school_type TEXT, -- 受験した学校の種別 (大学, 大学院, 短大, 専門学校, その他)
    school_name TEXT NOT NULL, -- 受験した学校の名前
    exam_date TEXT, -- 試験を受けた日
    department_name TEXT, -- 学部、学科、コース
    exam_type TEXT, -- 試験の種類 (推薦、一般、AO等)
    
    -- 作文・小論文
    essay_exists TEXT, -- 作文・小論文の有無 (あり, なし)
    essay_time TEXT, -- 試験時間 (分)
    essay_theme TEXT, -- テーマ
    
    -- 日本語試験
    japanese_exists TEXT, -- 日本語試験の有無 (あり, なし)
    japanese_time TEXT, -- 試験時間 (分)
    japanese_level TEXT, -- レベル (N1, N2, N3, N4, N5, その他)
    japanese_content TEXT, -- 試験内容 (JSON配列文字列: 漢字, 語彙, 文法, 読解, 聴解, 記述, その他)
    
    -- 面接
    interview_exists TEXT, -- 面接の有無 (あり, なし)
    interview_time TEXT, -- 面接時間 (分)
    interview_teachers TEXT, -- 面接官の人数
    interview_students TEXT, -- 同室受験者数
    interview_question_1 TEXT, -- 質問1
    interview_question_2 TEXT, -- 質問2
    interview_question_3 TEXT, -- 質問3
    interview_question_4 TEXT, -- 質問4
    interview_question_5 TEXT, -- 質問5
    
    -- その他
    other_exam_exists TEXT, -- その他の試験の有無 (あり, なし)
    other_exam_content TEXT, -- 試験内容
    other_exam_time TEXT, -- 試験時間 (分)
    
    -- アドバイス
    advice TEXT, -- 後輩へのアドバイス
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.student_exam_surveys ENABLE ROW LEVEL SECURITY;

-- Allow all operations for Server Actions
CREATE POLICY "Allow all operations for student_exam_surveys" 
    ON public.student_exam_surveys 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
