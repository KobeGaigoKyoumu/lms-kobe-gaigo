-- =====================================================
-- 出席率テーブル
-- =====================================================

-- 出席率データテーブル
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,          -- 学籍番号
  student_name TEXT NOT NULL,        -- 氏名
  gender TEXT,                       -- 性別
  nationality TEXT,                  -- 国籍
  year INTEGER NOT NULL,             -- データ年度
  month INTEGER NOT NULL,            -- データ月
  is_cumulative BOOLEAN DEFAULT FALSE,  -- 累計フラグ
  attendance_days INTEGER DEFAULT 0,    -- 出席日数
  absence_days INTEGER DEFAULT 0,       -- 欠席日数
  attendance_slots INTEGER DEFAULT 0,   -- 出席コマ
  late_slots INTEGER DEFAULT 0,         -- 遅早コマ
  absence_slots INTEGER DEFAULT 0,      -- 欠席コマ
  attendance_rate DECIMAL(5,4) DEFAULT 0, -- 出欠率
  grade INTEGER,                     -- 学年
  class_code TEXT,                   -- クラスコード
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, year, month, is_cumulative)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_year_month ON public.attendance_records(year, month);
CREATE INDEX IF NOT EXISTS idx_attendance_cumulative ON public.attendance_records(is_cumulative);
CREATE INDEX IF NOT EXISTS idx_attendance_grade ON public.attendance_records(grade);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON public.attendance_records(class_code);

-- RLSを有効化
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ポリシー: 管理者と教師は全てのデータを表示可能
CREATE POLICY "Teachers and admins can view all attendance"
  ON public.attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- ポリシー: 学生は自分のデータのみ表示可能
CREATE POLICY "Students can view own attendance"
  ON public.attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.student_id = attendance_records.student_id
    )
  );

-- ポリシー: 管理者のみ挿入・更新・削除可能
CREATE POLICY "Admins can manage attendance"
  ON public.attendance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
