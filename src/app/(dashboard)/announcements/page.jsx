import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'
import Link from 'next/link'
import styles from './page.module.css'
import AnnouncementCard from './AnnouncementCard'

export default async function AnnouncementsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 現在のユーザーのプロファイル
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'

    // お知らせ一覧取得（ピン留め優先、新しい順）
    const { data: announcements, error } = await supabase
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
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>お知らせ</h1>
                    <p className={styles.subtitle}>学校からの重要なお知らせ</p>
                </div>
                {isTeacherOrAdmin && (
                    <Link href="/announcements/new" className={styles.createBtn}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 4v12M4 10h12" />
                        </svg>
                        新規作成
                    </Link>
                )}
            </header>

            {error && (
                <div className={styles.error}>お知らせの取得に失敗しました</div>
            )}

            {announcements?.length === 0 ? (
                <div className={styles.empty}>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                        <path d="M40 16v20a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V16" />
                        <path d="M12 16l20-12 20 12" />
                        <path d="M32 28v12" />
                    </svg>
                    <p>お知らせはありません</p>
                    {isTeacherOrAdmin && (
                        <Link href="/announcements/new" className={styles.emptyBtn}>
                            最初のお知らせを作成
                        </Link>
                    )}
                </div>
            ) : (
                <div className={styles.list}>
                    {announcements?.map(announcement => (
                        <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            canEdit={isTeacherOrAdmin && (announcement.author?.id === user?.id || profile?.role === 'admin')}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
