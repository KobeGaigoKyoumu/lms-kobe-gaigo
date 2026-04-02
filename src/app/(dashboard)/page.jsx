import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'
import { redirect } from 'next/navigation'
import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { 
    LayoutDashboard, 
    BookOpen, 
    ClipboardCheck, 
    Bell, 
    Calendar as CalendarIcon,
    ChevronRight,
    Search,
    TrendingUp
} from 'lucide-react'

// 30秒間キャッシュ（再訪問時の高速化）
export const revalidate = 30

export default async function DashboardPage() {
    const adminMember = await getAdminMemberSession()
    const studentSession = await getStudentSessionLight()

    // Redirect students to their portal if they hit the root dashboard
    if (studentSession) {
        redirect('/student/dashboard')
    }

    if (!adminMember) {
        redirect('/login')
    }

    const firstName = adminMember.name || 'ユーザー'
    const isTeacher = true // Admin members are always teachers/admins
    const userId = adminMember.memberId
    const supabase = await createClient()

    // Fetch Announcements
    const { data: announcements } = await supabase
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
            author_id,
            sender_name,
            author:profiles!author_id (full_name)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

    // Fetch Basic Stats if Teacher
    let stats = {
        enrolledClassesCount: 0,
        pendingAssignmentsCount: 0,
        recentAssignments: []
    }

    if (isTeacher) {
        // Find classes where this user is the teacher or homeroom teacher
        const { data: teacherClasses } = await supabase
            .from('classes')
            .select('name, teacher_id, homeroom_teacher_name')
            .or(`teacher_id.eq.${userId},homeroom_teacher_name.eq."${adminMember.name}"`)

        const teacherClassNamesRaw = teacherClasses?.map(c => c.name) || []
        const teacherClassNames = teacherClassNamesRaw.map(n => n.trim())
        stats.enrolledClassesCount = teacherClassNames.length

        if (teacherClassNames.length > 0) {
            const now = new Date().toISOString()
            const [pendingResult, assignmentsResult] = await Promise.all([
                supabase
                    .from('homework_submissions')
                    .select('id, assignment:homework_assignments!inner(class_name, released_at)', { count: 'exact', head: true })
                    .eq('status', 'submitted')
                    .in('assignment.class_name', teacherClassNames)
                    .or(`assignment.released_at.is.null,assignment.released_at.lte."${now}"`),
                supabase
                    .from('homework_assignments')
                    .select(`
                        id,
                        title,
                        deadline,
                        class_name,
                        released_at
                    `)
                    .in('class_name', teacherClassNames)
                    .or(`released_at.is.null,released_at.lte."${now}"`)
                    .order('created_at', { ascending: false })
                    .limit(5)
            ])
            stats.pendingAssignmentsCount = pendingResult.count || 0
            stats.recentAssignments = assignmentsResult.data || []
        }
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>おかえりなさい、{firstName}さん</h1>
                    <p className={styles.subtitle}>教職員ポータルへようこそ</p>
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

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                        <BookOpen size={24} color="white" />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>担当クラス</p>
                        <p className={styles.statValue}>{stats.enrolledClassesCount}</p>
                    </div>
                    <div className={styles.statTrend}>
                        <TrendingUp size={14} className={styles.trendIcon} />
                        <span>Active</span>
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
                        <Link href="/admin/broadcast" className={styles.viewMore}>すべて見る</Link>
                    </div>
                    <div className={styles.announcementList}>
                        {announcements && announcements.length > 0 ? (
                            announcements.map(ann => (
                                <div key={ann.id} className={styles.announcementItem}>
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
                                </div>
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
        </div>
    )
}
