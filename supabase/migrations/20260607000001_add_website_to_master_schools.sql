-- master_schoolsテーブルにホームページURLを保存するwebsiteカラムを追加
ALTER TABLE public.master_schools ADD COLUMN IF NOT EXISTS website TEXT;
