-- 1. お知らせ一覧用 View の作成
-- クライアント側から JOIN 処理を減らすため、あらかじめ情報を統合した View を作成します。
CREATE OR REPLACE VIEW view_announcements AS
SELECT
    a.id,
    a.title,
    a.content,
    a.is_pinned,
    a.created_at,
    a.author_id,
    a.sender_name,
    a.course_id,
    a.file_urls,
    a.target_type,
    a.target_grade,
    a.target_class,
    a.target_student_ids,
    p.full_name AS author_name,
    p.avatar_url AS author_avatar_url,
    c.title AS course_title
FROM announcements a
LEFT JOIN profiles p ON a.author_id = p.id
LEFT JOIN courses c ON a.course_id = c.id;

-- 2. 教職員向けステータス集約 RPC の作成
-- Vercel Function で複数クエリを回すのを防ぎ、1回の通信で統計情報を取得します。
CREATE OR REPLACE FUNCTION get_admin_status(
    p_teacher_id UUID,
    p_teacher_name TEXT,
    p_class_names TEXT[]
)
RETURNS JSON AS $$
DECLARE
    v_class_count INT;
    v_pending_count INT;
    v_has_announcement BOOLEAN;
BEGIN
    -- 1. 担当クラス数
    v_class_count := array_length(p_class_names, 1);

    -- 2. 自分の担当クラスにおける未採点課題（status = 'submitted'）の数
    SELECT COUNT(*) INTO v_pending_count
    FROM homework_submissions s
    JOIN homework_assignments a ON s.assignment_id = a.id
    WHERE a.class_name = ANY(p_class_names)
      AND s.status = 'submitted'
      AND (a.is_archived IS NULL OR a.is_archived = false)
      AND (a.released_at IS NULL OR a.released_at <= NOW());

    -- 3. 新着お知らせがあるか
    SELECT EXISTS(
        SELECT 1 FROM announcements
        WHERE created_at >= NOW() - INTERVAL '3 days'
    ) INTO v_has_announcement;

    RETURN json_build_object(
        'enrolled_classes_count', COALESCE(v_class_count, 0),
        'pending_assignments_count', COALESCE(v_pending_count, 0),
        'has_new_announcement', v_has_announcement
    );
END;
$$ LANGUAGE plpgsql;
