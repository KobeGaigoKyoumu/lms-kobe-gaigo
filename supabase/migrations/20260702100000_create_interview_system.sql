-- 1. 教師の曜日別予約テンプレート時間
CREATE TABLE IF NOT EXISTS public.interview_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1:月, 2:火, 3:水, 4:木, 5:金
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, day_of_week)
);

-- 2. 15分刻みの個別予約スロット
CREATE TABLE IF NOT EXISTS public.interview_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'booked', 'blocked')) DEFAULT 'available',
  student_id_text TEXT REFERENCES public.students(student_id_text) ON DELETE SET NULL,
  notes TEXT, -- 面談用相談内容またはメモ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, slot_date, start_time) -- 同日の同時間帯に重複する枠の防止
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_slots_date_teacher ON public.interview_slots(slot_date, teacher_id);
CREATE INDEX IF NOT EXISTS idx_slots_student ON public.interview_slots(student_id_text);

-- RLS (Row Level Security) の設定
ALTER TABLE public.interview_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_slots ENABLE ROW LEVEL SECURITY;

-- サーバーの管理者権限でバイパス処理を行うため、USING/CHECK を TRUE に設定
DROP POLICY IF EXISTS "Admin full access to templates" ON public.interview_templates;
DROP POLICY IF EXISTS "Admin full access to slots" ON public.interview_slots;

CREATE POLICY "Admin full access to templates" ON public.interview_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to slots" ON public.interview_slots FOR ALL USING (true) WITH CHECK (true);
