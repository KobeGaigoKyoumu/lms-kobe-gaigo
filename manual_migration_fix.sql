-- 1. カレンダーイベントへの「対象クラス」列の追加
-- 列が既に存在する場合でもエラーにはなりませんが、まだ追加されていない可能性が高いです。
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'target_class') THEN
        ALTER TABLE public.calendar_events ADD COLUMN target_class TEXT DEFAULT NULL;
    END IF;
END $$;

-- 2. 検索高速化のためのインデックス作成
CREATE INDEX IF NOT EXISTS idx_calendar_events_target_class ON public.calendar_events(target_class);

-- 3. （もし不足している場合に備えて）カレンダーテンプレート関連のポリシー修正は削除しました
-- 既にテーブルが存在するようなので、この部分はスキップします。

-- 完了メッセージ（SupabaseのSQLエディタでは結果が表示されない場合がありますが、エラーが出なければ成功です）
SELECT 'Migration completed successfully' as result;
