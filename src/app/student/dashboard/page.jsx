import { getStudentAssignments } from '@/app/actions/homework'
import { getMessengerStatus } from '@/actions/messenger'
import ConnectMessenger from './ConnectMessenger'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, ChevronRight, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function StudentDashboard() {
    const assignments = await getStudentAssignments()
    const messengerStatus = await getMessengerStatus()

    // Sort: Not submitted first, then by deadline
    const sortedAssignments = Array.isArray(assignments) ? assignments.sort((a, b) => {
        // First priority: Submission status (Unsubmitted < Submitted)
        const aSubmitted = !!a.submission
        const bSubmitted = !!b.submission
        if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1

        // Second priority: Deadline
        return new Date(a.deadline) - new Date(b.deadline)
    }) : []

    return (
        <div>
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
                        {assignments.filter(a => !!a.submission).length}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>獲得ポイント</span>
                    <span className={styles.statValue}>
                        {assignments.reduce((sum, a) => sum + (a.submission?.score || 0), 0)}
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
