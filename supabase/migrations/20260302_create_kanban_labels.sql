-- Kanban Labels
CREATE TABLE IF NOT EXISTS kanban_labels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE kanban_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kanban_labels"
    ON kanban_labels FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert kanban_labels"
    ON kanban_labels FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update kanban_labels"
    ON kanban_labels FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete kanban_labels"
    ON kanban_labels FOR DELETE
    TO authenticated
    USING (true);

-- Initial Data
INSERT INTO kanban_labels (name, color, position) VALUES
('未完了', '#e74c3c', 0),
('完了', '#27ae60', 1),
('重要', '#f39c12', 2),
('Purple', '#9b59b6', 3),
('Blue', '#3498db', 4),
('Red', '#e74c3c', 5),
('Orange', '#e67e22', 6),
('Cyan', '#1abc9c', 7)
ON CONFLICT DO NOTHING;
