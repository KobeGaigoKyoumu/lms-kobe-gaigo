-- 1. クラス名の正規化関数を DB に用意
CREATE OR REPLACE FUNCTION public.normalize_class_name(name TEXT) 
RETURNS TEXT AS $$
DECLARE
    temp_name TEXT;
BEGIN
    IF name IS NULL THEN RETURN ''; END IF;
    temp_name := trim(name);
    -- 全角数字・全角スペースを補正
    temp_name := translate(temp_name, '０１２３４５６７８９　', '0123456789 ');
    -- その他の空白を削除
    RETURN regexp_replace(temp_name, '\s+', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. 学生ダッシュボード用の一括取得 RPC
CREATE OR REPLACE FUNCTION public.get_student_dashboard_data(
    p_student_id TEXT,
    p_class_name TEXT,
    p_academic_year INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_next_week TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '7 days';
    v_stats JSONB;
    v_assignments JSONB;
    v_announcements JSONB;
    v_student_grade TEXT;
    v_current_year INTEGER := EXTRACT(YEAR FROM NOW());
    v_is_before_april BOOLEAN := EXTRACT(MONTH FROM NOW()) < 4;
    v_academic_year_base INTEGER;
    v_norm_class TEXT;
BEGIN
    v_academic_year_base := CASE WHEN v_is_before_april THEN v_current_year - 1 ELSE v_current_year END;
    v_student_grade := (v_academic_year_base - p_academic_year + 1)::TEXT;
    v_norm_class := public.normalize_class_name(p_class_name);

    -- お知らせ (Top 3)
    SELECT jsonb_agg(t) INTO v_announcements
    FROM (
        SELECT 
            a.id, a.title, a.content, a.is_pinned, a.created_at, a.sender_name, a.target_type, a.target_class,
            p.full_name as author_name,
            adm.name as admin_author_name
        FROM public.announcements a
        LEFT JOIN public.profiles p ON a.author_id = p.id
        LEFT JOIN public.admin_members adm ON a.author_id = adm.id
        WHERE 
            (a.target_type = 'all' OR a.target_type IS NULL)
            OR (a.target_type = 'grade' AND a.target_grade = v_student_grade)
            OR (a.target_type = 'class' AND public.normalize_class_name(a.target_class) = v_norm_class)
            OR (a.target_type = 'individual' AND p_student_id = ANY(COALESCE(a.target_student_ids, ARRAY[]::TEXT[])))
        ORDER BY a.is_pinned DESC, a.created_at DESC
        LIMIT 3
    ) t;

    -- 統計と最近の課題
    WITH student_submissions AS (
        SELECT assignment_id, score, status 
        FROM public.homework_submissions 
        WHERE student_id_text = p_student_id
    ),
    visible_assignments AS (
        SELECT 
            a.id, a.title, a.deadline, a.class_name, a.subject,
            s.score, s.status as submission_status
        FROM public.homework_assignments a
        LEFT JOIN student_submissions s ON a.id = s.assignment_id
        WHERE 
            public.normalize_class_name(a.class_name) = v_norm_class
            AND (a.is_archived IS NULL OR a.is_archived = FALSE)
            AND (a.released_at IS NULL OR a.released_at <= v_now)
    )
    SELECT jsonb_build_object(
        'unsubmittedCount', COUNT(*) FILTER (WHERE submission_status IS NULL AND (deadline IS NULL OR deadline >= v_now)),
        'completedCount', COUNT(*) FILTER (WHERE submission_status IS NOT NULL),
        'submissionPoints', COALESCE(SUM(score) FILTER (WHERE submission_status IS NOT NULL), 0),
        'dueThisWeekCount', COUNT(*) FILTER (WHERE submission_status IS NULL AND deadline >= v_now AND deadline <= v_next_week)
    ) INTO v_stats
    FROM visible_assignments;

    SELECT jsonb_agg(t) INTO v_assignments
    FROM (
        SELECT id, title, deadline, class_name, subject, (submission_status IS NOT NULL) as is_submitted
        FROM (
             SELECT 
                a.id, a.title, a.deadline, a.class_name, a.subject,
                s.status as submission_status
            FROM public.homework_assignments a
            LEFT JOIN student_submissions s ON a.id = s.assignment_id
            WHERE 
                public.normalize_class_name(a.class_name) = v_norm_class
                AND (a.is_archived IS NULL OR a.is_archived = FALSE)
                AND (a.released_at IS NULL OR a.released_at <= v_now)
            ORDER BY (s.status IS NOT NULL) ASC, a.deadline ASC
            LIMIT 5
        ) sub
    ) t;

    RETURN jsonb_build_object(
        'stats', v_stats,
        'recentAssignments', COALESCE(v_assignments, '[]'::jsonb),
        'announcements', COALESCE(v_announcements, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 学生用お知らせ一覧取得 RPC
CREATE OR REPLACE FUNCTION public.get_student_announcements(
    p_student_id TEXT,
    p_class_name TEXT,
    p_academic_year INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_student_grade TEXT;
    v_current_year INTEGER := EXTRACT(YEAR FROM NOW());
    v_is_before_april BOOLEAN := EXTRACT(MONTH FROM NOW()) < 4;
    v_academic_year_base INTEGER;
    v_norm_class TEXT;
BEGIN
    v_academic_year_base := CASE WHEN v_is_before_april THEN v_current_year - 1 ELSE v_current_year END;
    v_student_grade := (v_academic_year_base - p_academic_year + 1)::TEXT;
    v_norm_class := public.normalize_class_name(p_class_name);

    RETURN (
        SELECT jsonb_agg(t)
        FROM (
            SELECT 
                a.*,
                p.full_name as author_name,
                adm.name as admin_author_name
            FROM public.announcements a
            LEFT JOIN public.profiles p ON a.author_id = p.id
            LEFT JOIN public.admin_members adm ON a.author_id = adm.id
            WHERE 
                (a.target_type = 'all' OR a.target_type IS NULL)
                OR (a.target_type = 'grade' AND a.target_grade = v_student_grade)
                OR (a.target_type = 'class' AND public.normalize_class_name(a.target_class) = v_norm_class)
                OR (a.target_type = 'individual' AND p_student_id = ANY(COALESCE(a.target_student_ids, ARRAY[]::TEXT[])))
            ORDER BY a.is_pinned DESC, a.created_at DESC
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
