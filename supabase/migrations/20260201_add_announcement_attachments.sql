-- =====================================================
-- 神戸外語 LMS - スキーマ移行: お知らせへのファイル添付対応
-- =====================================================

-- 1. announcements テーブルに file_urls カラムを追加
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS file_urls JSONB DEFAULT '[]'::jsonb;

-- 2. 確認用インデックス（必要に応じて）
-- CREATE INDEX IF NOT EXISTS idx_announcements_file_urls ON public.announcements USING GIN (file_urls);

-- =====================================================
-- 確認クエリ
-- =====================================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'announcements';
