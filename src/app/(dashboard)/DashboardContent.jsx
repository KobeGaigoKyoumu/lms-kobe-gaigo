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
    LayoutDashboard,
    MessageSquare
} from 'lucide-react'

const formatDateWithWeekday = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
}

export default function DashboardContent({ adminMember, initialData, interviews = [], interviewDates = {} }) {
    const [upcomingPlans] = useState(initialData?.upcomingPlans || [])
    const [ongoingTasks] = useState(initialData?.ongoingTasks || [])
    const [stats] = useState(initialData?.stats || {
        teacherClasses: [],
        enrolledClassesCount: 0,
        pendingAssignmentsCount: 0,
        recentAssignments: []
    })

    const [expandedPlans, setExpandedPlans] = useState(new Set())

    const toggleExpandPlan = (e, planId) => {
        e.preventDefault()
        e.stopPropagation()
        setExpandedPlans(prev => {
            const next = new Set(prev)
            if (next.has(planId)) {
                next.delete(planId)
            } else {
                next.add(planId)
            }
            return next
        })
    }

    const jstToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const yyyy = jstToday.getFullYear()
    const mm = String(jstToday.getMonth() + 1).padStart(2, '0')
    const dd = String(jstToday.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    const groupedPlans = upcomingPlans.reduce((groups, plan) => {
        const date = plan.date;
        if (!groups[date]) groups[date] = [];
        groups[date].push(plan);
        return groups;
    }, {});

    // 面談予定を当日・翌日でグループ
    const todayInterviews = interviews.filter(s => s.slot_date === interviewDates.today)
    const tomorrowInterviews = interviews.filter(s => s.slot_date === interviewDates.tomorrow)
    const hasInterviews = todayInterviews.length > 0 || tomorrowInterviews.length > 0

    const renderInterviewRow = (slot) => (
        <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', borderLeft: '3px solid var(--primary-400)' }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--primary-600)', minWidth: '95px' }}>
                {slot.start_time?.substring(0,5)} 〜 {slot.end_time?.substring(0,5)}
            </span>
            <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                {slot.student?.full_name || '学生情報なし'}
            </span>
            {slot.student?.class_name && (
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1px 7px', borderRadius: '4px' }}>
                    {slot.student.class_name}
                </span>
            )}
            {slot.notes && (
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {slot.notes}
                </span>
            )}
        </div>
    )

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

            {/* 面談予定セクション */}
            <div style={{ marginBottom: 'var(--spacing-6)', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 24px', borderBottom: hasInterviews ? '1px solid var(--border-color)' : 'none', background: 'linear-gradient(135deg, var(--primary-50), #f5f3ff)' }}>
                    <MessageSquare size={18} color="var(--primary-600)" />
                    <h2 style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: 'var(--primary-700)' }}>本日・翌日の面談予定</h2>
                    <Link href="/career" style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--primary-500)', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        面談管理へ <ChevronRight size={14} />
                    </Link>
                </div>
                {!hasInterviews ? (
                    <div style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                        本日・翌日の面談予定はありません
                    </div>
                ) : (
                    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {todayInterviews.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-secondary)' }}>本日</span>
                                    <span style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: '11px', fontWeight: '700', padding: '1px 8px', borderRadius: '999px' }}>{todayInterviews.length}件</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {todayInterviews.map(renderInterviewRow)}
                                </div>
                            </div>
                        )}
                        {tomorrowInterviews.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-secondary)' }}>翌日</span>
                                    <span style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: '700', padding: '1px 8px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>{tomorrowInterviews.length}件</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {tomorrowInterviews.map(renderInterviewRow)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.mainGrid}>
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
                            Object.entries(groupedPlans).map(([dateStr, plansForDate]) => {
                                const isToday = dateStr === todayStr
                                return (
                                    <div key={dateStr} className={styles.dateGroup}>
                                        <div className={`${styles.dateGroupHeader} ${isToday ? styles.todayGroupHeader : ''}`}>
                                            <CalendarIcon size={14} />
                                            <span>{formatDateWithWeekday(dateStr)}</span>
                                            {isToday && <span className={styles.todayBadge}>本日</span>}
                                        </div>
                                        <div className={styles.dateGroupPlans}>
                                            {plansForDate.map(plan => (
                                                <Link href="/kanban" key={plan.id} className={`${styles.announcementItem} ${isToday ? styles.todayPlan : ''}`}>
                                                    <h4 className={styles.announcementTitle}>{plan.title}</h4>
                                                    {plan.description && (
                                                        <div className={styles.planDescSection}>
                                                            <button 
                                                                className={styles.planExpandBtn} 
                                                                onClick={(e) => toggleExpandPlan(e, plan.id)}
                                                            >
                                                                {expandedPlans.has(plan.id) ? '▲ 説明を閉じる' : '▼ 説明を見る'}
                                                            </button>
                                                            {expandedPlans.has(plan.id) && (
                                                                <div className={styles.planDescription}>
                                                                    {plan.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
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
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <ClipboardCheck size={20} />
                            進行中の業務
                        </h2>
                        <Link href="/kanban" className={styles.viewMore}>すべて見る</Link>
                    </div>
                    <div className={styles.announcementList}>
                        {ongoingTasks && ongoingTasks.length > 0 ? (
                            ongoingTasks.map(task => (
                                <Link href="/kanban" key={task.id} className={`${styles.announcementItem} ${styles.ongoingPlan}`}>
                                    {task.date && (
                                        <div className={styles.announcementHeader} style={{ marginBottom: '8px' }}>
                                            <span className={styles.announcementDate}>
                                                <CalendarIcon size={12} />
                                                {formatDateWithWeekday(task.date)}
                                            </span>
                                        </div>
                                    )}
                                    <h4 className={styles.announcementTitle}>{task.title}</h4>
                                    {task.description && (
                                        <div className={styles.planDescSection}>
                                            <button 
                                                className={styles.planExpandBtn} 
                                                onClick={(e) => toggleExpandPlan(e, task.id)}
                                            >
                                                {expandedPlans.has(task.id) ? '▲ 説明を閉じる' : '▼ 説明を見る'}
                                            </button>
                                            {expandedPlans.has(task.id) && (
                                                <div className={styles.planDescription}>
                                                    {task.description}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Link>
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>
                                    <ClipboardCheck size={40} />
                                </div>
                                <p>進行中の業務はありません</p>
                            </div>
                        )}
                    </div>
                </section>
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
            </div>
        </>
    )
}
