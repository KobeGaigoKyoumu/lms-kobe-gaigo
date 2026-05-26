'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, Clock, ChevronRight, AlertCircle, Megaphone, Home, Loader2 } from 'lucide-react'
import styles from './page.module.css'
import DashboardStats from './components/DashboardStats'

export default function StudentDashboardClient({ initialData }) {
    const [mounted, setMounted] = useState(false)
    const [data, setData] = useState(initialData)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        setMounted(true)
    }, [])



    if (error) {
        return (
            <div className={styles.page}>
                <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4f' }}>
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    if (loading || !data) {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>読み込み中...</h1>
                    </div>
                </header>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            </div>
        )
    }

    const { session, assignments, announcements: filteredAnnouncements } = data
    const firstName = session?.name?.split(' ')[0] || '学生'

    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Assignment Stats & Sorting: assignments is { active: [...], archived: [...] }
    const safeAssignments = assignments?.active || []
    const allAssignments = [...(assignments?.active || []), ...(assignments?.archived || [])]
    
    const unsubmitted = safeAssignments.filter(a => !a.submission)
    const completed = safeAssignments.filter(a => !!a.submission)
    const dueThisWeek = safeAssignments.filter(a => {
        if (!a.deadline) return false
        const deadline = new Date(a.deadline)
        return deadline >= now && deadline <= nextWeek
    })

    const gradedAssignments = allAssignments.filter(a => {
        // 日本の年度（4月始まり）の開始日を計算
        const itemDate = new Date(a.deadline || a.created_at || now);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const academicYearStart = new Date(currentMonth < 3 ? currentYear - 1 : currentYear, 3, 1);
        
        // 今年度の課題のみ対象とし、かつ採点済みのものをカウントする
        return itemDate >= academicYearStart && a.submission && a.submission.status === 'graded';
    });

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
                    {mounted ? now.toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                    }) : ''}
                </div>
            </header>

            <DashboardStats
                unsubmittedCount={unsubmitted.length}
                completedCount={completed.length}
                submissionPoints={gradedAssignments.reduce((sum, a) => sum + (a.submission?.score || 0), 0)}
                dueThisWeekCount={dueThisWeek.length}
            />

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
                                    {assignment.deadline && !isNaN(new Date(assignment.deadline).getTime()) && (
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
                                            {announcement.created_at && !isNaN(new Date(announcement.created_at).getTime()) ? (
                                                new Date(announcement.created_at).toLocaleDateString('ja-JP', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })
                                            ) : ''}
                                        </span>
                                        <span className={styles.announcementAuthor}>
                                            {announcement.sender_name || announcement.admin_author_name || announcement.author?.full_name || '配信元'}
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
