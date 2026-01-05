-- =====================================================
-- 神戸外語 LMS - データベーススキーマ
-- Supabase SQL Editor で実行してください
-- =====================================================

-- =====================================================
-- 1. ユーザープロファイルテーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  full_name_kana TEXT,  -- フリガナ
  avatar_url TEXT,
  role TEXT CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
  student_id TEXT,      -- 学籍番号（学生のみ）
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自動作成トリガー（新規ユーザー登録時）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. クラステーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  grade_level TEXT,     -- 初級、中級、上級など
  academic_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  teacher_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. クラスメンバーテーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- =====================================================
-- 4. コーステーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  syllabus TEXT,
  teacher_id UUID REFERENCES public.profiles(id),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. コース登録テーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- =====================================================
-- 6. 教材テーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('document', 'video', 'link', 'file')),
  url TEXT,
  file_path TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. 課題テーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. 課題提出テーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  score INTEGER,
  feedback TEXT,
  status TEXT CHECK (status IN ('draft', 'submitted', 'graded')) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  UNIQUE(assignment_id, student_id)
);

-- =====================================================
-- 9. お知らせテーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,  -- NULLなら全体通知
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. 出席テーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id, date)
);

-- =====================================================
-- 11. 時間割テーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=日曜
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Row Level Security (RLS) ポリシー
-- =====================================================

-- プロファイル
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "プロファイルは誰でも閲覧可能" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "自分のプロファイルのみ更新可能" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- クラス
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "クラスは誰でも閲覧可能" ON public.classes
  FOR SELECT USING (true);

CREATE POLICY "教師と管理者のみクラス作成可能" ON public.classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "担当教師と管理者のみクラス更新可能" ON public.classes
  FOR UPDATE USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- コース
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公開コースは誰でも閲覧可能" ON public.courses
  FOR SELECT USING (
    is_published = true OR
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "教師と管理者のみコース作成可能" ON public.courses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 課題
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "課題閲覧ポリシー" ON public.assignments
  FOR SELECT USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 提出物
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "自分の提出物のみ閲覧可能（学生）" ON public.submissions
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "学生は自分の提出物のみ作成可能" ON public.submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "学生は自分の提出物のみ更新可能" ON public.submissions
  FOR UPDATE USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
    )
  );

-- お知らせ
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "お知らせは誰でも閲覧可能" ON public.announcements
  FOR SELECT USING (true);

CREATE POLICY "教師と管理者のみお知らせ作成可能" ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 出席
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "出席閲覧ポリシー" ON public.attendance
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.classes c 
      WHERE c.id = class_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 教材・その他のテーブルにもRLS設定
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "クラスメンバー閲覧" ON public.class_members FOR SELECT USING (true);
CREATE POLICY "コース登録閲覧" ON public.course_enrollments FOR SELECT USING (true);
CREATE POLICY "教材閲覧" ON public.materials FOR SELECT USING (true);
CREATE POLICY "時間割閲覧" ON public.schedules FOR SELECT USING (true);

-- =====================================================
-- インデックス
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_class_members_class ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user ON public.class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, date);
