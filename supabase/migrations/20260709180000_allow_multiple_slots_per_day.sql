-- 既存の (teacher_id, template_name, day_of_week) の一意性制約を削除
ALTER TABLE public.interview_templates 
  DROP CONSTRAINT IF EXISTS interview_templates_teacher_id_template_name_day_of_week_key;

-- 重複防止のため、(teacher_id, template_name, day_of_week, start_time) の一意性制約を追加
ALTER TABLE public.interview_templates 
  ADD CONSTRAINT interview_templates_teacher_id_template_name_day_of_week_start_time_key 
  UNIQUE(teacher_id, template_name, day_of_week, start_time);
