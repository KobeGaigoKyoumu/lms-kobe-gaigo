-- homework_assignments テーブルに必要なカラムを追加
-- すでに存在する場合はスキップされるため安全です

ALTER TABLE public.homework_assignments 
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 既存の null データを修正して整合性を保つ
UPDATE public.homework_assignments SET is_archived = false WHERE is_archived IS NULL;
UPDATE public.homework_assignments SET released_at = created_at WHERE released_at IS NULL;

-- 検索パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_homework_assignments_class_name ON public.homework_assignments(class_name);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_is_archived ON public.homework_assignments(is_archived);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_released_at ON public.homework_assignments(released_at);
