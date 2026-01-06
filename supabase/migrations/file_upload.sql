-- =====================================================
-- 神戸外語 LMS - スキーマ移行: ファイルアップロード対応
-- このファイルを Supabase SQL Editor で実行してください
-- =====================================================

-- 1. submissions テーブルの file_url カラムを file_urls (JSONB) に変更
-- 既存のデータがある場合は、まずカラムを追加してからデータを移行します

-- まず新しいカラムを追加
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS file_urls JSONB DEFAULT '[]'::jsonb;

-- 既存のfile_urlデータをfile_urlsに移行（もしデータがある場合）
UPDATE public.submissions 
SET file_urls = jsonb_build_array(jsonb_build_object('name', 'ファイル', 'url', file_url))
WHERE file_url IS NOT NULL AND file_url != '';

-- 古いカラムは残しておく（互換性のため）
-- DROP COLUMN は必要に応じて後で行う


-- =====================================================
-- 2. Supabase Storage バケット作成
-- NOTE: これは Supabase ダッシュボードの Storage セクションで
-- 手動で作成する必要があります。
-- 
-- バケット名: assignments
-- 公開設定: Public
-- 許可するファイルタイプ: 全て（または制限したい場合は指定）
-- 最大ファイルサイズ: 50MB（推奨）
-- =====================================================

-- 3. Storage RLS ポリシー設定（ダッシュボードから設定することを推奨）
-- 以下はSQLでの設定例：

-- INSERT ポリシー（認証ユーザーのみアップロード可能）
-- storage.objects に対して設定
-- CREATE POLICY "Authenticated users can upload" ON storage.objects
--   FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT ポリシー(誰でも閲覧可能)
-- CREATE POLICY "Anyone can view" ON storage.objects
--   FOR SELECT USING (true);

-- DELETE ポリシー(自分のファイルのみ削除可能)
-- CREATE POLICY "Users can delete own files" ON storage.objects
--   FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[2]);


-- =====================================================
-- 確認クエリ：file_urls カラムが追加されたか確認
-- =====================================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'submissions';
