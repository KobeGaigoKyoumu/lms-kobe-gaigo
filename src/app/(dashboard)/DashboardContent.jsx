'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import styles from './page.module.css'
import { 
    BookOpen, 
    ClipboardCheck, 
    Bell, 
    Calendar as CalendarIcon,
    ChevronRight,
    TrendingUp,
    LayoutDashboard
} from 'lucide-react'

export default function DashboardContent({ adminMember }) {
    const [announcements, setAnnouncements] = useState([])
    const [stats, setStats] = useState({
        teacherClasses: [],
        enrolledClassesCount: 0,
        pendingAssignmentsCount: 0,
        recentAssignments: []
    })
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            if (!adminMember) return
            setLoading(true)

            try {
                const userId = adminMember.memberId
                const adminName = adminMember.name
                const now = new Date().toISOString()

                // 1. Fetch Teacher Classes
                // We use both ID and Name to cover different assignments
                const { data: teacherClasses, error: classError } = await supabase
                    .from('classes')
                    .select('name, teacher_id, homeroom_teacher_name')
                    .or(`teacher_id.eq.${userId || 0},homeroom_teacher_name.eq."${adminName || '不明'}"`)

                if (classError) console.error('Class fetch error:', classError)

                const normalizeClassName = (name) => {
                    if (!name) return ''
                    return typeof name === 'string' 
                        ? name.trim()
                            .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                            .replace(/[－ー—―]/g, '-')
                            .replace(/\s+/g, '') 
                        : name
                }

                const teacherClassNames = (teacherClasses || []).map(c => c.name)
                const enrolledClassesCount = teacherClassNames.length

                // 2. Parallel Fetch: Announcements and Homework Data
                // We'll fetch announcements and assignments in parallel, then fetch pending count
                const [annResult, assignmentsResult] = await Promise.all([
                    supabase
                        .from('announcements')
                        .select(`
                            id, title, content, is_pinned, created_at, sender_name,
                            author:profiles!author_id (full_name)
                        `)
                        .order('is_pinned', { ascending: false })
                        .order('created_at', { ascending: false })
                        .limit(5),
                    
                    enrolledClassesCount > 0 ? supabase
                        .from('homework_assignments')
                        .select('id, title, deadline, class_name, released_at, is_archived, created_at')
                        .in('class_name', teacherClassNames)
                        .order('created_at', { ascending: false })
                        .limit(50) : { data: [] }
                ])

                const allAssignments = assignmentsResult.data || []
                
                // Filter active assignments for "Recently Created"
                const activeAssignments = allAssignments.filter(a => {
                    const isNotArchived = !a.is_archived
                    const isReleased = !a.released_at || new Date(a.released_at) <= new Date()
                    return isNotArchived && isReleased
                }).slice(0, 5)

                // For pending count, we need to check ALL active assignments, not just the top 5
                // So we fetch a broader list of assignment IDs if needed, or just use the ones we have if 50 is enough
                const activeAssignmentIds = allAssignments
                    .filter(a => !a.is_archived)
                    .map(a => a.id)

                let pendingAssignmentsCount = 0
                if (activeAssignmentIds.length > 0) {
                    const { count } = await supabase
                        .from('homework_submissions')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'submitted')
                        .in('assignment_id', activeAssignmentIds)
                    
                    pendingAssignmentsCount = count || 0
                }

                setAnnouncements(annResult.data || [])
                setStats({
                    teacherClasses: teacherClasses || [],
                    enrolledClassesCount,
                    pendingAssignmentsCount,
                    recentAssignments: activeAssignments
                })
            } catch (err) {
                console.error('Dashboard data fetch error:', err)
            } finally {
                setLoading(false)
            }
        }


        fetchData()
    }, [adminMember, supabase])

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>ダッシュボードを読み込み中...</p>
            </div>
        )
    }

    return (
        <>
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                        <BookOpen size={24} color="white" />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>担当クラス</p>
                        <p className={styles.statValue} style={{ fontSize: '2.5rem', whiteSpace: 'nowrap' }}>
                            {stats.teacherClasses.length > 0 
                                ? stats.teacherClasses.map(c => c.name).join(' ') 
                                : '-'}
                        </p>
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
