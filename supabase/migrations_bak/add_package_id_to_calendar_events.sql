-- パッケージ適用追跡のため package_id カラムを calendar_events に追加
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS package_id UUID DEFAULT NULL;

-- パッケージIDでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_calendar_events_package_id ON public.calendar_events(package_id);
