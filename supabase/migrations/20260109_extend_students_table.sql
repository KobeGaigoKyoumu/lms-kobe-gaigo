-- ====================
-- 学生マスターテーブル拡張
-- 在籍者.xlsxの全カラムに対応
-- ====================

-- 新しいカラムを追加
ALTER TABLE students
ADD COLUMN IF NOT EXISTS name_kana TEXT,                    -- カタカナ
ADD COLUMN IF NOT EXISTS name_romaji TEXT,                  -- ローマ字
ADD COLUMN IF NOT EXISTS nationality TEXT,                  -- 国籍・地域
ADD COLUMN IF NOT EXISTS gender TEXT,                       -- 性別
ADD COLUMN IF NOT EXISTS birth_date DATE,                   -- 生年月日
ADD COLUMN IF NOT EXISTS visa_status TEXT,                  -- 在留資格
ADD COLUMN IF NOT EXISTS entry_date DATE,                   -- 入国日
ADD COLUMN IF NOT EXISTS visa_expiry DATE,                  -- 在留期限
ADD COLUMN IF NOT EXISTS passport_number TEXT,              -- パスポート番号
ADD COLUMN IF NOT EXISTS residence_card_number TEXT,        -- 在留カード番号
ADD COLUMN IF NOT EXISTS address TEXT,                      -- 住所
ADD COLUMN IF NOT EXISTS phone TEXT,                        -- 連絡方法（電話番号）
ADD COLUMN IF NOT EXISTS enrollment_period TEXT,            -- 期（入学期）
ADD COLUMN IF NOT EXISTS enrollment_date DATE,              -- 入学年月日
ADD COLUMN IF NOT EXISTS graduation_date DATE,              -- 卒業年月
ADD COLUMN IF NOT EXISTS course TEXT;                       -- コース

-- ====================
-- 確認用クエリ
-- ====================
-- SELECT * FROM students LIMIT 5;
