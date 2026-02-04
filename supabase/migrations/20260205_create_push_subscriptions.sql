-- =============================================
-- プッシュ通知購読管理テーブル (Push Subscriptions)
-- Web Push通知のためのブラウザエンドポイントを保存
-- =============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,                     -- profiles.id (UUID) または students.student_id_text
    endpoint TEXT UNIQUE NOT NULL,             -- ブラウザのエンドポイントURL
    p256dh TEXT NOT NULL,                      -- 公開鍵
    auth TEXT NOT NULL,                        -- 認証秘密
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLSを有効化
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自分の購読情報は閲覧・管理可能
CREATE POLICY "Users can manage their own subscriptions"
ON push_subscriptions FOR ALL
TO authenticated
USING (user_id = auth.uid()::text OR user_id = (SELECT student_id FROM profiles WHERE id = auth.uid()));

-- updated_at自動更新
CREATE TRIGGER push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_students_updated_at(); -- 既存の関数を再利用
