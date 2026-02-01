-- announcementsテーブルにターゲット配信用のカラムを追加
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all'; -- 'all', 'grade', 'class', 'individual', 'course'
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_grade TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_class TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_student_ids TEXT[]; -- 学籍番号の配列

-- 説明: お知らせの配信対象を詳細に指定するためのカラム群です。
