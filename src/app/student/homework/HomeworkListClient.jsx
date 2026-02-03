'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

export default function HomeworkListClient({ assignments }) {
    const [filter, setFilter] = useState('all') // 'all', 'unsubmitted', 'submitted'

    const filteredAssignments = assignments.filter(a => {
        const isSubmitted = a.submission && a.submission.status !== 'returned'
        if (filter === 'unsubmitted') return !isSubmitted
        if (filter === 'submitted') return isSubmitted
        return true
    })

    const getStatusBadge = (assignment) => {
        const isSubmitted = assignment.submission && assignment.submission.status !== 'returned'

        if (isSubmitted) {
            return <span className={`${styles.badge} ${styles.badgeSubmitted}`}>提出済</span>
        }

        const deadline = new Date(assignment.deadline)
        const now = new Date()
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return <span className={`${styles.badge} ${styles.badgeOverdue}`}>期限切れ</span>
        } else if (diffDays <= 3) {
            return <span className={`${styles.badge} ${styles.badgeSoon}`}>あと{diffDays}日</span>
        }
        return null
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return `${date.getMonth() + 1}/${date.getDate()}`
    }

    return (
        <div>
            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                >
                    すべて
                </button>
                <button
                    className={`${styles.tab} ${filter === 'unsubmitted' ? styles.active : ''}`}
                    onClick={() => setFilter('unsubmitted')}
                >
                    未提出
                </button>
                <button
                    className={`${styles.tab} ${filter === 'submitted' ? styles.active : ''}`}
                    onClick={() => setFilter('submitted')}
                >
                    提出済
                </button>
            </div>

            {/* List */}
            <div className={styles.list}>
                {filteredAssignments.length === 0 ? (
                    <div className={styles.emptyState}>
                        課題はありません
                    </div>
                ) : (
                    filteredAssignments.map(assignment => (
                        <Link
                            key={assignment.id}
                            href={`/student/homework/${assignment.id}`}
                            className={styles.card}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardTitle}>{assignment.title}</div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </div>

                            <div className={styles.cardMeta}>
                                <div className={styles.deadline}>
                                    <Clock size={14} />
                                    <span>{formatDate(assignment.deadline)}まで</span>
                                </div>
                                {getStatusBadge(assignment)}
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
