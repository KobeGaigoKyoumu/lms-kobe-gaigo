-- 既存のチェック制約を削除
ALTER TABLE public.interview_slots DROP CONSTRAINT IF EXISTS interview_slots_status_check;

-- 新しいチェック制約（pendingを含める）を追加
ALTER TABLE public.interview_slots ADD CONSTRAINT interview_slots_status_check CHECK (status IN ('available', 'booked', 'blocked', 'pending'));
