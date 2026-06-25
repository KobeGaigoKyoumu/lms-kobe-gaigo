'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { 
    BookOpen, 
    ClipboardCheck, 
    Bell, 
    Calendar as CalendarIcon,
    ChevronRight,
    LayoutDashboard
} from 'lucide-react'

const formatDateWithWeekday = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
}

export default function DashboardContent({ adminMember, initialData }) {
    // Use initialData provided by Server Component
    const [upcomingPlans] = useState(initialData?.upcomingPlans || [])
    const [stats] = useState(initialData?.stats || {
        teacherClasses: [],
        enrolledClassesCount: 0,
        pendingAssignmentsCount: 0,
        recentAssignments: []
    })

    const jstToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const yyyy = jstToday.getFullYear()
    const mm = String(jstToday.getMonth() + 1).padStart(2, '0')
    const dd = String(jstToday.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    return (
        <>
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                        <BookOpen size={24} color="white" />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>担当クラス</p>
                        <div className={styles.classList}>
                            {stats.enrolledClasses && stats.enrolledClasses.length > 0 
                                ? stats.enrolledClasses.map((c, i) => (
                                    <span key={i} className={styles.className}>{c}</span>
                                  ))
                                : <span className={styles.statValue}>-</span>}
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <ClipboardCheck size={24} color="white" />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>未採点課題</p>
                        <p className={styles.statValue}>{stats.pendingAssignmentsCount}</p>
                    </div>
                    {stats.pendingAssignmentsCount > 0 && (
                        <div className={`${styles.statStatus} ${styles.urgent}`}>
                            要対応
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.mainGrid}>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <BookOpen size={20} />
                            最近作成した課題
                        </h2>
                        <Link href="/assignments" className={styles.viewMore}>すべて見る</Link>
                    </div>
                    <div className={styles.assignmentList}>
                        {stats.recentAssignments && stats.recentAssignments.length > 0 ? (
                            stats.recentAssignments.map(a => (
                                <Link href={`/assignments/${a.id}`} key={a.id} className={styles.assignmentItem}>
                                    <div className={styles.assignmentInfo}>
                                        <h4>{a.title}</h4>
                                        <p>{a.class_name}</p>
                                    </div>
                                    <ChevronRight size={16} className={styles.itemArrow} />
                                </Link>
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>
                                    <LayoutDashboard size={40} />
                                </div>
                                <p>最近作成した課題はありません</p>
                            </div>
                        )}
                    </div>
                </section>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <CalendarIcon size={20} />
                            今後の予定
                        </h2>
                        <Link href="/kanban" className={styles.viewMore}>すべて見る</Link>
                    </div>
                    <div className={styles.announcementList}>
                        {upcomingPlans && upcomingPlans.length > 0 ? (
                            upcomingPlans.map(plan => {
                                const isToday = plan.date === todayStr
                                return (
                                    <Link href="/kanban" key={plan.id} className={`${styles.announcementItem} ${isToday ? styles.todayPlan : ''}`}>
                                        <div className={styles.announcementHeader}>
                                            <span className={styles.announcementDate}>
                                                <CalendarIcon size={12} />
                                                {formatDateWithWeekday(plan.date)}
                                            </span>
                                            <span className={styles.announcementAuthor}>
                                                {plan.admin_members?.name || '不明'}
                                            </span>
                                        </div>
                                        <h4 className={styles.announcementTitle}>{plan.title}</h4>
                                    </Link>
                                )
                            })
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>
                                    <CalendarIcon size={40} />
                                </div>
                                <p>今後の予定はありません</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </>
    )
}
