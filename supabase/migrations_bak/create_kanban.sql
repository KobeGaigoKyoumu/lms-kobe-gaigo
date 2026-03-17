-- Kanban Columns
CREATE TABLE IF NOT EXISTS kanban_columns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#f59e0b',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Kanban Cards
CREATE TABLE IF NOT EXISTS kanban_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    labels JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;

-- Policies (teachers/admins can CRUD)
CREATE POLICY "Authenticated users can view kanban_columns"
    ON kanban_columns FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert kanban_columns"
    ON kanban_columns FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update kanban_columns"
    ON kanban_columns FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete kanban_columns"
    ON kanban_columns FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view kanban_cards"
    ON kanban_cards FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert kanban_cards"
    ON kanban_cards FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update kanban_cards"
    ON kanban_cards FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete kanban_cards"
    ON kanban_cards FOR DELETE
    TO authenticated
    USING (true);
