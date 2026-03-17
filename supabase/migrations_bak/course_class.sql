-- =====================================================
-- 神戸外語 LMS - コース・クラス紐付けスキーマ
-- このファイルを Supabase SQL Editor で実行してください
-- =====================================================

-- クラスにコースIDカラムを追加
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_classes_course_id ON public.classes(course_id);

-- クラス削除ポリシー追加
CREATE POLICY "担当教師と管理者のみクラス削除可能" ON public.classes
  FOR DELETE USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- クラスメンバー追加ポリシー
CREATE POLICY "教師と管理者のみメンバー追加可能" ON public.class_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      ))
    )
  );

-- クラスメンバー削除ポリシー
CREATE POLICY "教師と管理者のみメンバー削除可能" ON public.class_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      ))
    )
  );

-- 時間割追加ポリシー
CREATE POLICY "教師と管理者のみ時間割追加可能" ON public.schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 時間割更新ポリシー
CREATE POLICY "教師と管理者のみ時間割更新可能" ON public.schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 時間割削除ポリシー
CREATE POLICY "教師と管理者のみ時間割削除可能" ON public.schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );
