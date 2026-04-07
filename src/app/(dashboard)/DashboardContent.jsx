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

export default function DashboardContent({ adminMember, initialData }) {
    // Initialize state with pre-fetched server-side data to eliminate client-side loading time and authentication issues
    const [announcements] = useState(initialData?.announcements || [])
    const [stats] = useState(initialData?.stats || {
        enrolledClasses: [],
        enrolledClassesCount: 0,
        pendingAssignmentsCount: 0,
        recentAssignments: []
    })

    // No longer need useEffect for initial fetching as data is provided by RSC
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
                            {stats.enrolledClasses.length > 0 ? (
                                <>
                                    {stats.enrolledClasses.slice(0, 3).map((name, i) => (
                                        <div key={i} className={styles.className}>{name}</div>
                                    ))}
                                    {stats.enrolledClasses.length > 3 && (
                                        <div className={styles.classMore}>外 {stats.enrolledClasses.length - 3}クラス</div>
                                    )}
                                </>
                            ) : (
                                <div className={styles.className}>なし</div>
                            )}
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
                        {stats.recentAssignments.length > 0 ? (
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
                            <Bell size={20} />
                            お知らせ
                        </h2>
                        <Link href="/announcements" className={styles.viewMore}>すべて見る</Link>
                    </div>
                    <div className={styles.announcementList}>
                        {announcements && announcements.length > 0 ? (
                            announcements.map(ann => (
                                <Link href="/announcements" key={ann.id} className={styles.announcementItem}>
                                    <div className={styles.announcementHeader}>
                                        <span className={styles.announcementDate}>
                                            <CalendarIcon size={12} />
                                            {new Date(ann.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                        <span className={styles.announcementAuthor}>
                                            {ann.author?.full_name || ann.sender_name || '配信元'}
                                        </span>
                                    </div>
                                    <h4 className={styles.announcementTitle}>{ann.title}</h4>
                                </Link>
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>
                                    <Bell size={40} />
                                </div>
                                <p>現在、新しいお知らせはありません</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </>
    )
}
