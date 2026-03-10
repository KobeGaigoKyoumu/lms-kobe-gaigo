-- =============================================
-- カンバンリマインダーテーブル (Kanban Reminders)
-- カンバンカードに対するリマインダー設定を保存
-- =============================================

CREATE TABLE IF NOT EXISTS kanban_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('daily', 'weekly', 'once')),
    remind_time TIME NOT NULL DEFAULT '09:00',
    remind_days INTEGER[] DEFAULT '{}',
    remind_date DATE,
    enabled BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_kanban_reminders_card_id ON kanban_reminders(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_reminders_enabled ON kanban_reminders(enabled);

-- RLS
ALTER TABLE kanban_reminders ENABLE ROW LEVEL SECURITY;

-- Policies (same as kanban_cards — authenticated users can CRUD)
CREATE POLICY "Authenticated users can view kanban_reminders"
    ON kanban_reminders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert kanban_reminders"
    ON kanban_reminders FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update kanban_reminders"
    ON kanban_reminders FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete kanban_reminders"
    ON kanban_reminders FOR DELETE
    TO authenticated
    USING (true);
