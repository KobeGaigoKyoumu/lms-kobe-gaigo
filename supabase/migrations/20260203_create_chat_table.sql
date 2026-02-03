-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    teacher_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'teacher')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_student_id ON messages(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow read access to everything for service_role (used by API)
CREATE POLICY "Allow all access for service role" ON messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users (Teachers) to read all messages
CREATE POLICY "Allow teachers to read all messages" ON messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users (Teachers) to insert messages
CREATE POLICY "Allow teachers to send messages" ON messages
    FOR INSERT
    TO authenticated
    WITH CHECK (sender_type = 'teacher');

-- Note: Student access is handled via API using Service Key because students are not auth.users
