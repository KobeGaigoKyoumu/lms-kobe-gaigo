-- Add index for faster message history retrieval
CREATE INDEX IF NOT EXISTS idx_messages_student_created_at 
ON messages (student_id, created_at DESC);

-- Optional: RPC function to get latest conversation for each student efficiently
-- This helps avoid fetching 2000 messages and aggregating in JS
CREATE OR REPLACE FUNCTION get_recent_conversations(teacher_id uuid)
RETURNS TABLE (
    student_id_text text,
    last_message text,
    last_message_at timestamptz,
    unread_count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_messages AS (
        SELECT DISTINCT ON (m.student_id)
            m.student_id,
            m.content,
            m.created_at,
            m.read,
            m.sender_type
        FROM messages m
        ORDER BY m.student_id, m.created_at DESC
    ),
    unread_counts AS (
        SELECT 
            m.student_id,
            COUNT(*) as count
        FROM messages m
        WHERE m.sender_type = 'student' AND m.read = false
        GROUP BY m.student_id
    )
    SELECT 
        lm.student_id as student_id_text,
        lm.content as last_message,
        lm.created_at as last_message_at,
        COALESCE(uc.count, 0) as unread_count
    FROM latest_messages lm
    LEFT JOIN unread_counts uc ON lm.student_id = uc.student_id;
END;
$$ LANGUAGE plpgsql;
