import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'

// 30秒間キャッシュ（再訪問時の高速化）
export const revalidate = 30
export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'ユーザー'

    // === データ取得の開始 (Waterfallの最小化) ===
    // 1. プロファイルとお知らせの取得を開始
    const profilePromise = supabase
        .from('profiles')
        .select('role, student_id_text')
        .eq('id', user?.id)
        .single()

    const announcementsPromise = supabase
        .from('announcements')
        .select(`
            id,
            title,
            content,
            is_pinned,
            created_at,
            target_type,
            target_grade,
            target_class,
            target_student_ids,
            course_id,
            author:profiles!author_id (full_name)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

    // 2. プロファイルのみ先に待機 (これがロール判定に必要)
    const profileResult = await profilePromise
    const profile = profileResult.data

    // お知らせはまだ待たない (バックグラウンドで進行中)

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

    // ロール別データのPromiseを格納する変数を準備
    let roleDataPromise = Promise.resolve(null)

    // 学生用セッション（クッキー形式）も確認（学生ポータル対応）
    const { getStudentSession } = await import('@/app/actions/studentAuth')
    const studentSession = await getStudentSession()

    // ロール判定の補完
    const isActuallyStudent = isStudent || !!studentSession

    if (isActuallyStudent) {
        // 学生用データを並列取得開始
        // student_idはプロファイルまたはクッキーから取得
        const userId = user?.id || studentSession?.userId // Note: studentSession might use different key
        const studentIdText = profile?.student_id_text || studentSession?.studentId

        roleDataPromise = Promise.all([
            supabase
                .from('course_enrollments')
                .select('course_id')
                .eq('user_id', userId),
            supabase
                .from('submissions')
                .select('assignment_id')
                .eq('student_id', userId),
            supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true })
                .gte('due_date', now.toISOString())
                .lte('due_date', nextWeek.toISOString()),
            supabase
                .from('students')
                .select('student_id_text, class_name, academic_year')
                .eq('student_id_text', studentIdText)
                .single()
        ]).then(async ([enrollmentsResult, submissionsResult, upcomingResult, studentResult]) => {
            const enrollments = enrollmentsResult.data || []
            const submittedAssignmentIds = (submissionsResult.data || []).map(s => s.assignment_id)

            let recentAssignmentsData = []
            if (enrollments.length > 0) {
                const enrolledCourseIds = enrollments.map(e => e.course_id)
                const { data } = await supabase
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
                recentAssignmentsData = data || []
            }

            return {
                enrolledCoursesCount: enrollments.length,
                upcomingEventsCount: upcomingResult.count || 0,
                pendingAssignmentsCount: recentAssignmentsData.filter(a =>
                    !submittedAssignmentIds.includes(a.id) &&
                    (!a.due_date || new Date(a.due_date) >= now)
                ).length,
                completedAssignmentsCount: submittedAssignmentIds.length,
                recentAssignments: recentAssignmentsData,
                studentInfo: studentResult.data,
                enrolledCourseIds: enrollments.map(e => e.course_id)
            }
        })

    } else if (isTeacher) {
        // 教師用データを並列取得開始
        roleDataPromise = Promise.all([
            supabase
                .from('courses')
                .select('id')
                .eq('teacher_id', user?.id),
            supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true })
                .gte('due_date', now.toISOString())
                .lte('due_date', nextWeek.toISOString())
        ]).then(async ([coursesResult, upcomingResult]) => {
            const teacherCourses = coursesResult.data || []
            const teacherCourseIds = teacherCourses.map(c => c.id)

            let pendingCount = 0
            let gradedCount = 0
            let assignmentsData = []

            if (teacherCourseIds.length > 0) {
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
                pendingCount = pendingResult.count || 0
                gradedCount = gradedResult.count || 0
                assignmentsData = assignmentsResult.data || []
            }

            return {
                enrolledCoursesCount: teacherCourses.length,
                upcomingEventsCount: upcomingResult.count || 0,
                pendingAssignmentsCount: pendingCount,
                completedAssignmentsCount: gradedCount,
                recentAssignments: assignmentsData
            }
        })
    } else {
        // その他
        roleDataPromise = supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .gte('due_date', now.toISOString())
            .lte('due_date', nextWeek.toISOString())
            .then(res => ({
                upcomingEventsCount: res.count || 0
            }))
    }

    // 3. ここで初めて「お知らせ」と「ロール別データ」の完了を待つ
    const [announcementsResult, roleData] = await Promise.all([
        announcementsPromise,
        roleDataPromise
    ])

    const announcements = announcementsResult.data
    const announcementsError = announcementsResult.error

    // データ展開
    if (roleData) {
        enrolledCoursesCount = roleData.enrolledCoursesCount || 0
        upcomingEventsCount = roleData.upcomingEventsCount || 0
        pendingAssignmentsCount = roleData.pendingAssignmentsCount || 0
        completedAssignmentsCount = roleData.completedAssignmentsCount || 0
        recentAssignments = roleData.recentAssignments || []
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
                    {announcementsError && (
                        <div className={styles.emptyState}>
                            <p style={{ color: '#ef4444' }}>お知らせの取得に失敗しました</p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{announcementsError.message}</p>
                        </div>
                    )}
                    {(() => {
                        let filteredAnnouncements = announcements || []
                        console.log('Dashboard Debug - Total announcements fetched:', filteredAnnouncements.length)
                        console.log('Dashboard Debug - roleData available:', !!roleData)
                        console.log('Dashboard Debug - isStudent:', isStudent, 'isActuallyStudent:', isActuallyStudent)

                        if (isActuallyStudent) {
                            // 学生用のフィルタリングロジック
                            const studentInfo = roleData?.studentInfo
                            const enrolledCourseIds = roleData?.enrolledCourseIds || []

                            console.log('Dashboard Debug - studentInfo:', studentInfo)

                            filteredAnnouncements = filteredAnnouncements.filter(ann => {
                                // target_typeがnull、空、または'all'の場合は全学生に表示
                                if (!ann.target_type || ann.target_type === 'all') return true

                                if (ann.target_type === 'grade' && studentInfo) {
                                    const currentYear = new Date().getFullYear()
                                    const isBeforeApril = new Date().getMonth() < 3
                                    const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
                                    const studentGrade = academicYearBase - studentInfo.academic_year + 1
                                    return String(studentGrade) === ann.target_grade
                                }
                                if (ann.target_type === 'class' && studentInfo) {
                                    return ann.target_class === studentInfo.class_name
                                }
                                if (ann.target_type === 'individual' && studentInfo) {
                                    return ann.target_student_ids?.includes(studentInfo.student_id_text)
                                }
                                if (ann.target_type === 'course') {
                                    return enrolledCourseIds.includes(ann.course_id)
                                }
                                return false
                            })
                            console.log('Dashboard Debug - After student filter:', filteredAnnouncements.length)
                            filteredAnnouncements = filteredAnnouncements.slice(0, 3)
                        } else {
                            filteredAnnouncements = filteredAnnouncements.slice(0, 5) // 管理者・教師は最大5件
                        }

                        if (!announcementsError && filteredAnnouncements.length === 0) {
                            return (
                                <div className={styles.emptyState}>
                                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                                        <path d="M36 14v18a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V14" />
                                        <path d="M8 14l16-10 16 10" />
                                        <path d="M24 22v10" />
                                    </svg>
                                    <p>お知らせはありません</p>
                                </div>
                            )
                        }

                        if (filteredAnnouncements.length > 0) {
                            return (
                                <div className={styles.announcementList}>
                                    {filteredAnnouncements.map(announcement => (
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
                            )
                        }
                        return null
                    })()}
                </section>
            </div>
        </div>
    )
}
