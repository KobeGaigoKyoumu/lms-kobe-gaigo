import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'

// 30秒間キャッシュ（再訪問時の高速化）
export const revalidate = 30
export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'ユーザー'

    // プロファイルとお知らせを並列取得
    const [profileResult, announcementsResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id)
            .single(),
        supabase
            .from('announcements')
            .select(`
                id,
                title,
                content,
                is_pinned,
                created_at,
                author:profiles!author_id (full_name)
            `)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(5)
    ])

    const profile = profileResult.data
    const announcements = announcementsResult.data

    const isStudent = profile?.role === 'student'
    const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin'

    // === 統計データの並列取得 ===
    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)

    let enrolledCoursesCount = 0
    let pendingAssignmentsCount = 0
    let completedAssignmentsCount = 0
    let recentAssignments = []
    let upcomingEventsCount = 0

    if (isStudent) {
        // 学生用データを並列取得
        const [enrollmentsResult, submissionsResult, upcomingResult] = await Promise.all([
            supabase
                .from('course_enrollments')
                .select('course_id')
                .eq('user_id', user?.id),
            supabase
                .from('submissions')
                .select('assignment_id')
                .eq('student_id', user?.id),
            supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true })
                .gte('due_date', now.toISOString())
                .lte('due_date', nextWeek.toISOString())
        ])

        const enrollments = enrollmentsResult.data || []
        const submittedAssignmentIds = (submissionsResult.data || []).map(s => s.assignment_id)
        enrolledCoursesCount = enrollments.length
        upcomingEventsCount = upcomingResult.count || 0

        const enrolledCourseIds = enrollments.map(e => e.course_id)

        if (enrolledCourseIds.length > 0) {
            const { data: assignments } = await supabase
                .from('assignments')
                .select(`
                    id,
                    title,
                    due_date,
                    max_score,
                    course:courses (id, title)
                `)
                .in('course_id', enrolledCourseIds)
                .order('due_date', { ascending: true })
                .limit(10)

            recentAssignments = assignments || []

            pendingAssignmentsCount = recentAssignments.filter(a =>
                !submittedAssignmentIds.includes(a.id) &&
                (!a.due_date || new Date(a.due_date) >= now)
            ).length

            completedAssignmentsCount = submittedAssignmentIds.length
        }
    } else if (isTeacher) {
        // 教師用データを並列取得
        const [coursesResult, upcomingResult] = await Promise.all([
            supabase
                .from('courses')
                .select('id')
                .eq('teacher_id', user?.id),
            supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true })
                .gte('due_date', now.toISOString())
                .lte('due_date', nextWeek.toISOString())
        ])

        const teacherCourses = coursesResult.data || []
        enrolledCoursesCount = teacherCourses.length
        upcomingEventsCount = upcomingResult.count || 0

        const teacherCourseIds = teacherCourses.map(c => c.id)

        if (teacherCourseIds.length > 0) {
            // 未採点・採点済み・課題一覧を並列取得
            const [pendingResult, gradedResult, assignmentsResult] = await Promise.all([
                supabase
                    .from('submissions')
                    .select('id, assignment:assignments!inner(course_id)', { count: 'exact', head: true })
                    .eq('status', 'submitted')
                    .in('assignment.course_id', teacherCourseIds),
                supabase
                    .from('submissions')
                    .select('id, assignment:assignments!inner(course_id)', { count: 'exact', head: true })
                    .eq('status', 'graded')
                    .in('assignment.course_id', teacherCourseIds),
                supabase
                    .from('assignments')
                    .select(`
                        id,
                        title,
                        due_date,
                        max_score,
                        course:courses (id, title)
                    `)
                    .in('course_id', teacherCourseIds)
                    .order('created_at', { ascending: false })
                    .limit(5)
            ])

            pendingAssignmentsCount = pendingResult.count || 0
            completedAssignmentsCount = gradedResult.count || 0
            recentAssignments = assignmentsResult.data || []
        }
    } else {
        // ゲスト/その他の場合
        const { count } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .gte('due_date', now.toISOString())
            .lte('due_date', nextWeek.toISOString())
        upcomingEventsCount = count || 0
    }

    return (
        <div className={styles.page}>
            {/* ヘッダー */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>おかえりなさい、{firstName}さん</h1>
                    <p className={styles.subtitle}>今日も頑張りましょう！</p>
                </div>
                <div className={styles.date}>
                    {new Date().toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                    })}
                </div>
            </header>

            {/* 統計カード */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M4 6h16M4 12h16M4 18h8" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{isTeacher ? '担当コース' : '登録コース'}</p>
                        <p className={styles.statValue}>{enrolledCoursesCount}</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{isTeacher ? '未採点' : '未提出課題'}</p>
                        <p className={styles.statValue}>{pendingAssignmentsCount}</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{isTeacher ? '採点済み' : '完了課題'}</p>
                        <p className={styles.statValue}>{completedAssignmentsCount}</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>今週の予定</p>
                        <p className={styles.statValue}>{upcomingEventsCount}</p>
                    </div>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className={styles.mainGrid}>
                {/* 最近の課題 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="7" y="2" width="6" height="4" rx="1" />
                        </svg>
                        最近の課題
                    </h2>
                    {recentAssignments.length === 0 ? (
                        <div className={styles.emptyState}>
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                                <path d="M18 10H14a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V14a4 4 0 0 0-4-4h-4" />
                                <rect x="16" y="4" width="16" height="8" rx="2" />
                            </svg>
                            <p>課題がありません</p>
                        </div>
                    ) : (
                        <div className={styles.assignmentList}>
                            {recentAssignments.map(assignment => (
                                <Link
                                    href={`/assignments/${assignment.id}`}
                                    key={assignment.id}
                                    className={styles.assignmentItem}
                                >
                                    <div className={styles.assignmentInfo}>
                                        <h4>{assignment.title}</h4>
                                        <p>{assignment.course?.title}</p>
                                    </div>
                                    {assignment.due_date && (
                                        <span className={styles.dueDate}>
                                            {new Date(assignment.due_date).toLocaleDateString('ja-JP', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* お知らせ */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M15 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M3 6l7-4 7 4" />
                            <path d="M10 10v4" />
                        </svg>
                        お知らせ
                    </h2>
                    {!announcements || announcements.length === 0 ? (
                        <div className={styles.emptyState}>
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                                <path d="M36 14v18a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V14" />
                                <path d="M8 14l16-10 16 10" />
                                <path d="M24 22v10" />
                            </svg>
                            <p>お知らせはありません</p>
                        </div>
                    ) : (
                        <div className={styles.announcementList}>
                            {announcements.map(announcement => (
                                <div key={announcement.id} className={styles.announcementItem}>
                                    <div className={styles.announcementHeader}>
                                        {announcement.is_pinned && (
                                            <span className={styles.pinBadge}>📌</span>
                                        )}
                                        <span className={styles.announcementDate}>
                                            {new Date(announcement.created_at).toLocaleDateString('ja-JP', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <h4>{announcement.title}</h4>
                                    <p>{announcement.content?.slice(0, 60)}...</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
