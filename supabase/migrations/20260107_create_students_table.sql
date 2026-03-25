-- =============================================
-- 学生マスターテーブル (Students Master)
-- 事前登録用のマスターデータを保持
-- =============================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS students (
    student_id_text TEXT PRIMARY KEY,           -- 学籍番号 (例: "2404159")
    full_name TEXT NOT NULL,                    -- 氏名
    email TEXT,                                 -- メールアドレス (Google OAuth照合用)
    class_name TEXT,                            -- 所属クラス (例: "2-1")
    academic_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),  -- 年度
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- RLSを有効化
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 認証済みユーザーは閲覧可能
DROP POLICY IF EXISTS "Students are viewable by authenticated users" ON students;
CREATE POLICY "Students are viewable by authenticated users"
ON students FOR SELECT
TO authenticated
USING (true);

-- RLSポリシー: 管理者・教師は編集可能
DROP POLICY IF EXISTS "Students are editable by admin and teachers" ON students;
CREATE POLICY "Students are editable by admin and teachers"
ON students FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'teacher')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'teacher')
    )
);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_students_updated_at();

-- =============================================
-- 確認用クエリ
-- =============================================
-- SELECT * FROM students;
