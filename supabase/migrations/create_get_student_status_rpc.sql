-- Supabase RPC: 学生のステータスを1回のクエリで集約取得
-- Vercel側の複数DBクエリを1つにまとめ、CPU使用量を削減

CREATE OR REPLACE FUNCTION get_student_status(
  p_student_id TEXT,
  p_class_name TEXT
)
RETURNS JSON AS $$
DECLARE
  v_unread INT;
  v_unsubmitted INT;
  v_has_announcement BOOLEAN;
BEGIN
  -- 1. 未読メッセージ数（先生からの未読）
  SELECT COUNT(*) INTO v_unread
  FROM messages
  WHERE student_id = p_student_id
    AND sender_type = 'teacher'
    AND read = false;

  -- 2. 未提出課題数（提出なし or 返却済）
  SELECT COUNT(*) INTO v_unsubmitted
  FROM homework_assignments a
  WHERE a.class_name = p_class_name
    AND NOT EXISTS (
      SELECT 1 FROM homework_submissions s
      WHERE s.assignment_id = a.id
        AND s.student_id_text = p_student_id
        AND s.status != 'returned'
    );

  -- 3. 新着お知らせ（直近3日以内）
  SELECT EXISTS(
    SELECT 1 FROM announcements
    WHERE created_at >= NOW() - INTERVAL '3 days'
      AND (target_type IS NULL OR target_type = 'all'
           OR (target_type = 'class' AND target_class = p_class_name))
  ) INTO v_has_announcement;

  RETURN json_build_object(
    'unread_message_count', v_unread,
    'unsubmitted_assignment_count', v_unsubmitted,
    'has_new_announcement', v_has_announcement
  );
END;
$$ LANGUAGE plpgsql;
