-- Admin Members Table
CREATE TABLE IF NOT EXISTS admin_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'teacher',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert admin members
INSERT INTO admin_members (name, password) VALUES
    ('田中', '4721'),
    ('北條', '5183'),
    ('三浦', '6294'),
    ('中井', '7365'),
    ('稲垣', '8476'),
    ('吉川', '9527'),
    ('中野', '3648'),
    ('木下', '2759'),
    ('宮川', '1830'),
    ('吉田', '4962'),
    ('横田', '5073'),
    ('中田', '6184'),
    ('阿蘇', '7295'),
    ('単',   '8306')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE admin_members ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (via API routes / server actions)
CREATE POLICY "Service role access only"
    ON admin_members
    FOR ALL
    USING (false);
