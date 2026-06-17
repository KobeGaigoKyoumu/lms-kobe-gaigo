-- master_schoolsテーブルに学部・学科・コース情報を保存するdepartmentsカラムを追加
ALTER TABLE public.master_schools ADD COLUMN IF NOT EXISTS departments TEXT;
