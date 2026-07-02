-- UNIQUE制約を削除して新しいtemplate_nameを追加する
ALTER TABLE public.interview_templates DROP CONSTRAINT IF EXISTS interview_templates_teacher_id_day_of_week_key;

ALTER TABLE public.interview_templates ADD COLUMN IF NOT EXISTS template_name TEXT NOT NULL DEFAULT 'デフォルト';

-- 既存の制約があれば削除してから再追加
ALTER TABLE public.interview_templates DROP CONSTRAINT IF EXISTS interview_templates_teacher_id_template_name_day_of_week_key;
ALTER TABLE public.interview_templates ADD CONSTRAINT interview_templates_teacher_id_template_name_day_of_week_key UNIQUE(teacher_id, template_name, day_of_week);
