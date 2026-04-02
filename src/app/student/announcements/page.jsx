import { createClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'
import { normalizeClassName } from '@/lib/utils'
import styles from './page.module.css'
import AnnouncementCard from '@/app/(dashboard)/announcements/AnnouncementCard'

export const dynamic = 'force-dynamic'

export default async function StudentAnnouncementsPage() {
    const supabase = await createClient()
    const session = await getStudentSession()

    if (!session) return null

    // 1. 学生が所属しているコースの一覧を取得
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', session.studentId)

    const courseIds = enrollments?.map(e => e.course_id) || []

    // 2. お知らせ一覧取得 (コースIDが null または 自分のコースに含まれるものをザックリ取得)
    let query = supabase
        .from('announcements')
        .select(`
            id, title, content, is_pinned, created_at, author_id, course_id, file_urls, sender_name,
            target_type, target_grade, target_class, target_student_ids,
            author:profiles!author_id (
                id,
                full_name,
                avatar_url
            ),
            course:courses (
                id,
                title
            )
        `)

    if (courseIds.length > 0) {
        query = query.or(`course_id.is.null,course_id.in.(${courseIds.join(',')})`)
    } else {
        query = query.is('course_id', null)
    }

    const { data: rawAnnouncements, error } = await query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

    // 3. 厳格なクラス判定フィルター (他クラス向けを除外)
    let filteredAnnouncements = (rawAnnouncements || []).filter(ann => {
        if (!ann.target_type || ann.target_type === 'all') return true

        if (ann.target_type === 'grade') {
            if (!session.academicYear) return false
            const currentYear = new Date().getFullYear()
            const isBeforeApril = new Date().getMonth() < 3
            const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
            const studentGrade = academicYearBase - session.academicYear + 1
            return String(studentGrade) === ann.target_grade
        }
        if (ann.target_type === 'class') {
            return normalizeClassName(ann.target_class) === normalizeClassName(session.className)
        }
        if (ann.target_type === 'individual') {
            return ann.target_student_ids?.includes(session.studentId)
        }
        return false
    })

    // 4. Complement author names from admin_members
    let announcements = filteredAnnouncements
    const authorIdsWithNoProfiles = announcements
        .filter(ann => !ann.author?.full_name && ann.author_id)
        .map(ann => ann.author_id)
    
    if (authorIdsWithNoProfiles.length > 0) {
        const { data: admins } = await supabase
            .from('admin_members')
            .select('id, name')
            .in('id', authorIdsWithNoProfiles)
        
        if (admins) {
            const adminMap = new Map(admins.map(a => [a.id, a.name]))
            announcements = announcements.map(ann => ({
                ...ann,
                admin_author_name: adminMap.get(ann.author_id) || null
            }))
        }
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>お知らせ</h1>
                    <p className={styles.subtitle}>学校からの重要なお知らせ</p>
                </div>
            </header>

            {error && (
                <div className={styles.error}>お知らせの取得に失敗しました</div>
            )}

            {announcements?.length === 0 ? (
                <div className={styles.empty}>
                    <p>現在、お知らせはありません。</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {announcements?.map(announcement => (
                        <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            canEdit={false} // 学生は編集不可
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
