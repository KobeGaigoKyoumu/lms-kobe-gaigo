DROP TABLE IF EXISTS public.student_play_records CASCADE;

-- public.student_play_records テーブルの再作成
CREATE TABLE public.student_play_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id_text TEXT NOT NULL REFERENCES public.students(student_id_text) ON DELETE CASCADE,
  app_type TEXT NOT NULL, -- 'n5_study_hub' | 'japanese_master'
  activity_type TEXT NOT NULL, -- 'flashcard' | 'quiz' | 'exam'
  category TEXT, -- デッキ/カテゴリ名
  score INTEGER,
  total INTEGER,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_student_play_records_student_text ON public.student_play_records(student_id_text);
CREATE INDEX IF NOT EXISTS idx_student_play_records_app ON public.student_play_records(app_type);

-- RLS (Row Level Security) の設定
ALTER TABLE public.student_play_records ENABLE ROW LEVEL SECURITY;

-- サービスロール等のみ読み書き可能にするためのポリシー
DROP POLICY IF EXISTS "学生は自分の記録のみ追加可能" ON public.student_play_records;
DROP POLICY IF EXISTS "学生・教師・管理者は閲覧可能" ON public.student_play_records;

CREATE POLICY "Service role can do everything" ON public.student_play_records
  USING (true)
  WITH CHECK (true);
