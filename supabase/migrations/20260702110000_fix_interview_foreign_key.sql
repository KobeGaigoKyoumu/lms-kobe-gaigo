-- 1. 既存の外部キー制約を削除
ALTER TABLE public.interview_templates 
  DROP CONSTRAINT IF EXISTS interview_templates_teacher_id_fkey;

ALTER TABLE public.interview_slots 
  DROP CONSTRAINT IF EXISTS interview_slots_teacher_id_fkey;

-- 2. 新しい外部キー制約 (admin_members(id) への参照) を追加
ALTER TABLE public.interview_templates 
  ADD CONSTRAINT interview_templates_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES public.admin_members(id) ON DELETE CASCADE;

ALTER TABLE public.interview_slots 
  ADD CONSTRAINT interview_slots_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES public.admin_members(id) ON DELETE CASCADE;
