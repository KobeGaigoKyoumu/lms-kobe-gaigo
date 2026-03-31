'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

export default function HomeworkListClient({ assignmentsData = { active: [], archived: [] } }) {
    const [viewMode, setViewMode] = useState('active') // 'active' or 'archived'
    const [filter, setFilter] = useState('all') // 'all', 'unsubmitted', 'submitted'

    const currentAssignments = viewMode === 'active' ? assignmentsData.active : assignmentsData.archived

    const filteredAssignments = currentAssignments.filter(a => {
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
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setViewMode('active')}
                    style={{
                        padding: '0.5rem 0', background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer',
                        fontWeight: viewMode === 'active' ? '600' : '400',
                        color: viewMode === 'active' ? '#4f46e5' : '#6b7280',
                        borderBottom: viewMode === 'active' ? '2px solid #4f46e5' : '2px solid transparent',
                        marginBottom: '-9px'
                    }}
                >
                    これからの課題
                </button>
                <button
                    onClick={() => setViewMode('archived')}
                    style={{
                        padding: '0.5rem 0', background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer',
                        fontWeight: viewMode === 'archived' ? '600' : '400',
                        color: viewMode === 'archived' ? '#4f46e5' : '#6b7280',
                        borderBottom: viewMode === 'archived' ? '2px solid #4f46e5' : '2px solid transparent',
                        marginBottom: '-9px'
                    }}
                >
                    過去の課題・提出履歴
                </button>
            </div>

            {/* Filter Tabs */}
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
                            style={viewMode === 'archived' ? { opacity: 0.8, background: '#fafafa' } : {}}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardTitle}>
                                    {assignment.title}
                                    {viewMode === 'archived' && (
                                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                                            ({assignment.class_name})
                                        </span>
                                    )}
                                </div>
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
