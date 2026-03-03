import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'
import { redirect } from 'next/navigation'
import { getStudentSession } from '@/app/actions/studentAuth'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

// 30秒間キャッシュ（再訪問時の高速化）
export const revalidate = 30

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const studentSession = await getStudentSession()

    // Redirect students to their portal if they hit the root dashboard
    if (studentSession) {
        redirect('/student/dashboard')
    }

    // Check for admin member session (cookie-based)
    const adminMember = await getAdminMemberSession()

    // From here on, it's either a logged-in Supabase user (Admin/Teacher), admin member, or a guest
    if (!user && !adminMember) {
        redirect('/login')
    }

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || adminMember?.name || 'ユーザー'

    // Fetch Profile (only for Supabase users)
    let isTeacher = true // Admin members are always teachers
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, student_id_text')
            .eq('id', user.id)
            .single()

        isTeacher = profile?.role === 'teacher' || profile?.role === 'admin'
    }

    // Fetch Announcements
    const { data: announcements } = await supabase
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
        .limit(5)

    // Fetch Basic Stats if Teacher
    let stats = {
        enrolledCoursesCount: 0,
        pendingAssignmentsCount: 0,
        completedAssignmentsCount: 0,
        upcomingEventsCount: 0,
        recentAssignments: []
    }

    if (isTeacher && user) {
        const { data: teacherCourses } = await supabase
            .from('courses')
            .select('id')
            .eq('teacher_id', user.id)

        const teacherCourseIds = teacherCourses?.map(c => c.id) || []
        stats.enrolledCoursesCount = teacherCourseIds.length

        if (teacherCourseIds.length > 0) {
            const [pendingResult, assignmentsResult] = await Promise.all([
                supabase
                    .from('submissions')
                    .select('id, assignment:assignments!inner(course_id)', { count: 'exact', head: true })
                    .eq('status', 'submitted')
                    .in('assignment.course_id', teacherCourseIds),
                supabase
                    .from('assignments')
                    .select(`
                        id,
                        title,
                        due_date,
                        course:courses (id, title)
                    `)
                    .in('course_id', teacherCourseIds)
                    .order('created_at', { ascending: false })
                    .limit(5)
            ])
            stats.pendingAssignmentsCount = pendingResult.count || 0
            stats.recentAssignments = assignmentsResult.data || []
        }
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>おかえりなさい、{firstName}さん</h1>
                    <p className={styles.subtitle}>教職員ポータルへようこそ</p>
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

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h8" /></svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>担当コース</p>
                        <p className={styles.statValue}>{stats.enrolledCoursesCount}</p>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>未採点課題</p>
                        <p className={styles.statValue}>{stats.pendingAssignmentsCount}</p>
                    </div>
                </div>
            </div>

            <div className={styles.mainGrid}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>最近作成した課題</h2>
                    <div className={styles.assignmentList}>
                        {stats.recentAssignments.map(a => (
                            <Link href={`/assignments/${a.id}`} key={a.id} className={styles.assignmentItem}>
                                <div>
                                    <h4>{a.title}</h4>
                                    <p>{a.course?.title}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>お知らせ</h2>
                    <div className={styles.announcementList}>
                        {announcements?.map(ann => (
                            <div key={ann.id} className={styles.announcementItem}>
                                <span className={styles.announcementDate}>{new Date(ann.created_at).toLocaleDateString()}</span>
                                <h4>{ann.title}</h4>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
