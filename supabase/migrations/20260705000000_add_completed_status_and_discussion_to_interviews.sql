-- 1. 既存のステータスチェック制約を削除
ALTER TABLE public.interview_slots DROP CONSTRAINT IF EXISTS interview_slots_status_check;

-- 2. 新しいステータスチェック制約（completedを含める）を追加
ALTER TABLE public.interview_slots ADD CONSTRAINT interview_slots_status_check CHECK (status IN ('available', 'booked', 'blocked', 'pending', 'completed'));

-- 3. 話し合った内容 (discussion_content) と 指示 (instructions) カラムを追加
ALTER TABLE public.interview_slots ADD COLUMN IF NOT EXISTS discussion_content TEXT;
ALTER TABLE public.interview_slots ADD COLUMN IF NOT EXISTS instructions TEXT;
