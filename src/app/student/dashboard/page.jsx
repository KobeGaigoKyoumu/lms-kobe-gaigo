import { getStudentAssignments } from '@/app/actions/homework'
import { getMessengerStatus } from '@/actions/messenger'
import { getStudentSession } from '@/app/actions/studentAuth'
import { createClient } from '@/lib/supabase/server'
import ConnectMessenger from './ConnectMessenger'
import AnnouncementCard from '@/app/(dashboard)/announcements/AnnouncementCard'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, ChevronRight, AlertCircle, Megaphone } from 'lucide-react'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function StudentDashboard() {
    const supabase = await createClient()
    const session = await getStudentSession()

    // データ取得を並列化
    const [assignments, messengerStatus, announcementsResult, studentResult] = await Promise.all([
        getStudentAssignments(),
        getMessengerStatus(),
        supabase
            .from('announcements')
            .select(`
                *,
                author:profiles!author_id (full_name)
            `)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(50),
        session ? supabase
            .from('students')
            .select('student_id_text, class_name, academic_year')
            .eq('student_id_text', session.studentId)
            .single() : Promise.resolve({ data: null })
    ])

    const announcements = announcementsResult.data || []
    const studentInfo = studentResult.data

    // ターゲットに応じたフィルタリング
    const filteredAnnouncements = announcements.filter(ann => {
        if (!ann.target_type || ann.target_type === 'all') return true
        if (!studentInfo) return false

        if (ann.target_type === 'grade') {
            const currentYear = new Date().getFullYear()
            const isBeforeApril = new Date().getMonth() < 3
            const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
            const studentGrade = academicYearBase - studentInfo.academic_year + 1
            return String(studentGrade) === ann.target_grade
        }
        if (ann.target_type === 'class') {
            return ann.target_class === studentInfo.class_name
        }
        if (ann.target_type === 'individual') {
            return ann.target_student_ids?.includes(studentInfo.student_id_text)
        }
        return false
    }).slice(0, 3)

    // Sort: Not submitted first, then by deadline
    const sortedAssignments = Array.isArray(assignments) ? assignments.sort((a, b) => {
        const aSubmitted = !!a.submission
        const bSubmitted = !!b.submission
        if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1
        return new Date(a.deadline) - new Date(b.deadline)
    }) : []

    return (
        <div className={styles.container}>
            {/* お知らせセクション */}
            <section className={styles.announcementSection}>
                <h2 className={styles.sectionHeader}>
                    <Megaphone size={20} className={styles.headerIcon} />
                    お知らせ
                </h2>
                {filteredAnnouncements.length === 0 ? (
                    <div className={styles.emptyAnnouncements}>
                        現在、新しいお知らせはありません。
                    </div>
                ) : (
                    <div className={styles.announcementGrid}>
                        {filteredAnnouncements.map(ann => (
                            <AnnouncementCard
                                key={ann.id}
                                announcement={ann}
                                canEdit={false}
                            />
                        ))}
                    </div>
                )}
                {filteredAnnouncements.length > 0 && (
                    <Link href="/student/announcements" className={styles.viewMoreLink}>
                        すべて見る <ChevronRight size={16} />
                    </Link>
                )}
            </section>

            <h1 className={styles.title}>課題一覧</h1>

            <ConnectMessenger
                connected={messengerStatus.connected}
                studentId={messengerStatus.studentId}
                pageId={process.env.NEXT_PUBLIC_FB_PAGE_ID}
            />

            {/* Stats Summary */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>全課題数</span>
                    <span className={styles.statValue}>{assignments.length}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>提出済み</span>
                    <span className={styles.statValue}>
                        {(Array.isArray(assignments) ? assignments : []).filter(a => !!a.submission).length}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>獲得ポイント</span>
                    <span className={styles.statValue}>
                        {(Array.isArray(assignments) ? assignments : []).reduce((sum, a) => sum + (a.submission?.score || 0), 0)}
                    </span>
                    <span className={styles.statUnit}>pt</span>
                </div>
            </div>

            {sortedAssignments.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>現在、課題はありません。</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {sortedAssignments.map((assignment) => {
                        const isSubmitted = !!assignment.submission
                        const deadlineDate = new Date(assignment.deadline)
                        const isOverdue = !isSubmitted && deadlineDate < new Date()

                        let statusClass = styles.statusPending
                        if (isSubmitted) statusClass = styles.statusSubmitted
                        if (isOverdue) statusClass = styles.statusOverdue

                        return (
                            <Link
                                key={assignment.id}
                                href={`/student/homework/${assignment.id}`}
                                className={`${styles.card} ${statusClass}`}
                            >
                                <div className={styles.cardContent}>
                                    <div className={styles.mainInfo}>
                                        <div className={styles.statusRow}>
                                            {isSubmitted ? (
                                                <span className={`${styles.statusBadge} ${styles.badgeSubmitted}`}>
                                                    <CheckCircle2 size={12} className={styles.icon} /> 提出済み
                                                </span>
                                            ) : isOverdue ? (
                                                <span className={`${styles.statusBadge} ${styles.badgeOverdue}`}>
                                                    <AlertCircle size={12} className={styles.icon} /> 期限切れ
                                                </span>
                                            ) : (
                                                <span className={`${styles.statusBadge} ${styles.badgePending}`}>
                                                    <Circle size={12} className={styles.icon} /> 未提出
                                                </span>
                                            )}
                                        </div>
                                        <h2 className={styles.cardTitle}>{assignment.title}</h2>
                                        <div className={styles.meta}>
                                            <span className={styles.metaItem}>
                                                <Clock size={14} />
                                                期限: {deadlineDate.toLocaleDateString('ja-JP')} {deadlineDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className={styles.chevron} />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
