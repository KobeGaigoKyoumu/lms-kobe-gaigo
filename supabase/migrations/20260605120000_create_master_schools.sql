-- master_schools テーブルの作成
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.master_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR UNIQUE,
    name VARCHAR NOT NULL,
    school_type VARCHAR NOT NULL, -- 'university', 'junior_college', 'vocational_school', 'graduate_school'
    kana VARCHAR NOT NULL,
    katakana VARCHAR NOT NULL,
    romaji VARCHAR NOT NULL,
    prefecture VARCHAR,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- トリグラムインデックスを作成して部分一致検索を高速化
CREATE INDEX IF NOT EXISTS master_schools_search_idx ON public.master_schools USING GIN (
    name gin_trgm_ops,
    kana gin_trgm_ops,
    katakana gin_trgm_ops,
    romaji gin_trgm_ops
);

-- school_typeでの絞り込み用インデックス
CREATE INDEX IF NOT EXISTS master_schools_type_idx ON public.master_schools(school_type);

-- RLS（行レベルセキュリティ）の設定。認証ユーザーが読み取れるようにする。
ALTER TABLE public.master_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.master_schools
    FOR SELECT USING (true);
