-- =====================================================
-- 神戸外語 LMS - カレンダーイベントスキーマ
-- このファイルを Supabase SQL Editor で実行してください
-- =====================================================

-- イベントテーブル
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  event_type TEXT CHECK (event_type IN ('class', 'exam', 'holiday', 'other')) DEFAULT 'other',
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT TRUE,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 誰でも公開イベントを閲覧可能
CREATE POLICY "公開イベントは誰でも閲覧可能" ON public.calendar_events
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

-- 教師と管理者のみイベント作成可能
CREATE POLICY "教師と管理者のみイベント作成可能" ON public.calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 作成者のみ更新可能
CREATE POLICY "作成者のみイベント更新可能" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = created_by);

-- 作成者のみ削除可能
CREATE POLICY "作成者のみイベント削除可能" ON public.calendar_events
  FOR DELETE USING (auth.uid() = created_by);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON public.calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_course_id ON public.calendar_events(course_id);
