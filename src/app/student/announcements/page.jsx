import { createClient } from '@/lib/supabase/server'
import { getStudentSessionLight } from '@/app/actions/studentAuth'
import styles from './page.module.css'
import AnnouncementCard from '@/app/(dashboard)/announcements/AnnouncementCard'
export const revalidate = 60

export default async function StudentAnnouncementsPage() {
    const supabase = await createClient()
    const session = await getStudentSessionLight()

    if (!session) return null

    // 1. 学生が所属しているコースの一覧を取得
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', session.id)

    const courseIds = enrollments?.map(e => e.course_id) || []

    // 2. お知らせ一覧取得
    let query = supabase
        .from('announcements')
        .select(`
            id, title, content, is_pinned, created_at, author_id, course_id, file_urls,
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

    const { data: announcements, error } = await query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

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
