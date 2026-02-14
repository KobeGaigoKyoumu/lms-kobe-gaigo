import { getStudentAssignments } from '@/app/actions/homework'
import { getStudentSession } from '@/app/actions/studentAuth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, ChevronRight, AlertCircle, Megaphone, Home } from 'lucide-react'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function StudentDashboard() {
    const supabase = await createClient()
    const session = await getStudentSession()

    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Parallel data fetching
    const [assignments, announcementsResult] = await Promise.all([
        getStudentAssignments(),
        supabase
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
    ])

    const announcements = announcementsResult.data || []
    const firstName = session?.name?.split(' ')[0] || '学生'

    // Announcement Filtering
    // Use session data for filtering
    const filteredAnnouncements = announcements.filter(ann => {
        if (!ann.target_type || ann.target_type === 'all') return true
        if (!session) return false

        if (ann.target_type === 'grade') {
            // Fallback if academicYear is missing in old sessions (though unlikely after re-login)
            // If missing, we might need to fetch or just default to false/true?
            // Since we updated the cookie logic, new logins will have it. 
            // For immediate effect without forcing logout, we might want a fallback, 
            // but strict optimization requests implies we rely on the improved session.
            // Let's assume session has it or we accept a minor glitch until re-login.
            // Actually, we can just fetch if missing, but that defeats the purpose.
            // Let's rely on session.
            if (!session.academicYear) return false

            const currentYear = new Date().getFullYear()
            const isBeforeApril = new Date().getMonth() < 3
            const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
            const studentGrade = academicYearBase - session.academicYear + 1
            return String(studentGrade) === ann.target_grade
        }
        if (ann.target_type === 'class') {
            return ann.target_class === session.className
        }
        if (ann.target_type === 'individual') {
            return ann.target_student_ids?.includes(session.studentId)
        }
        return false
    }).slice(0, 3)

    // Assignment Stats & Sorting
    const safeAssignments = Array.isArray(assignments) ? assignments : []
    const unsubmitted = safeAssignments.filter(a => !a.submission)
    const completed = safeAssignments.filter(a => !!a.submission)
    const dueThisWeek = safeAssignments.filter(a => {
        if (!a.deadline) return false
        const deadline = new Date(a.deadline)
        return deadline >= now && deadline <= nextWeek
    })

    const sortedAssignments = safeAssignments.sort((a, b) => {
        const aSubmitted = !!a.submission
        const bSubmitted = !!b.submission
        if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1
        return new Date(a.deadline) - new Date(b.deadline)
    }).slice(0, 5)

    return (
        <div className={styles.page}>
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

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                {/* Unsubmitted */}
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>未提出課題</p>
                        <p className={styles.statValue}>{unsubmitted.length}</p>
                    </div>
                </div>

                {/* Completed */}
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>完了課題</p>
                        <p className={styles.statValue}>{completed.length}</p>
                    </div>
                </div>

                {/* Submission Points */}
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>課題提出点</p>
                        <p className={styles.statValue}>
                            {completed.reduce((sum, a) => sum + (a.submission?.score || 0), 0)}
                            <span className={styles.statUnit}>pt</span>
                        </p>
                    </div>
                </div>

                {/* Due this week */}
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>今週の締切</p>
                        <p className={styles.statValue}>{dueThisWeek.length}</p>
                    </div>
                </div>

            </div>

            {/* Main Content Grid */}
            <div className={styles.mainGrid}>
                {/* Recent Assignments */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                                <rect x="7" y="2" width="6" height="4" rx="1" />
                            </svg>
                            最近の課題
                        </h2>
                        <Link href="/student/homework" className={styles.viewAll}>すべて見る <ChevronRight size={16} /></Link>
                    </div>
                    {sortedAssignments.length === 0 ? (
                        <div className={styles.emptyState}>
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                                <path d="M18 10H14a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V14a4 4 0 0 0-4-4h-4" />
                                <rect x="16" y="4" width="16" height="8" rx="2" />
                            </svg>
                            <p>課題がありません</p>
                        </div>
                    ) : (
                        <div className={styles.assignmentList}>
                            {sortedAssignments.map(assignment => (
                                <Link
                                    href={`/student/homework/${assignment.id}`}
                                    key={assignment.id}
                                    className={styles.assignmentItem}
                                >
                                    <div className={styles.assignmentInfo}>
                                        <h4>{assignment.title}</h4>
                                        <p>{assignment.class_name}</p>
                                    </div>
                                    {assignment.deadline && (
                                        <span className={styles.dueDate}>
                                            {new Date(assignment.deadline).toLocaleDateString('ja-JP', {
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

                {/* Announcements */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <Home size={20} strokeWidth={1.5} />
                            お知らせ
                        </h2>
                        <Link href="/student/announcements" className={styles.viewAll}>すべて見る <ChevronRight size={16} /></Link>
                    </div>
                    {filteredAnnouncements.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Home size={48} strokeWidth={1.5} opacity={0.3} />
                            <p>お知らせはありません</p>
                        </div>
                    ) : (
                        <div className={styles.announcementList}>
                            {filteredAnnouncements.map(announcement => (
                                <Link
                                    href={`/student/announcements/${announcement.id}`}
                                    key={announcement.id}
                                    className={styles.announcementItem}
                                >
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
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
