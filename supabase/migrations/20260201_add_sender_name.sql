-- announcementsテーブルに配信者名（sender_name）カラムを追加
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- 説明: 任意選択の機能として、お知らせを実際に配信した担当者名を保存できるようにします。
