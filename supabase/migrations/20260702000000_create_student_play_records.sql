-- public.student_play_records テーブルの作成
CREATE TABLE IF NOT EXISTS public.student_play_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_type TEXT NOT NULL, -- 'n5_study_hub' | 'japanese_master'
  activity_type TEXT NOT NULL, -- 'flashcard' | 'quiz' | 'exam'
  category TEXT, -- デッキ/カテゴリ名
  score INTEGER,
  total INTEGER,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_student_play_records_student ON public.student_play_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_play_records_app ON public.student_play_records(app_type);

-- RLS (Row Level Security) の設定
ALTER TABLE public.student_play_records ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成
CREATE POLICY "学生は自分の記録のみ追加可能" ON public.student_play_records
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "学生・教師・管理者は閲覧可能" ON public.student_play_records
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );
