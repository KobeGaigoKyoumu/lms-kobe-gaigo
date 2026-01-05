import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'

export default async function AnnouncementsPage() {
    const supabase = await createClient()

    // お知らせ一覧取得（ピン留め優先、新しい順）
    const { data: announcements, error } = await supabase
        .from('announcements')
        .select(`
      *,
      author:profiles!author_id (
        full_name,
        avatar_url
      ),
      course:courses (
        title
      )
    `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>お知らせ</h1>
                <p className={styles.subtitle}>学校からの重要なお知らせ</p>
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
                </div>
            ) : (
                <div className={styles.list}>
                    {announcements?.map(announcement => (
                        <article key={announcement.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                {announcement.is_pinned && (
                                    <span className={styles.pinBadge}>
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                            <path d="M9.5 1L13 4.5L9.5 8L8.5 7L10.5 5H4a2.5 2.5 0 0 0 0 5h1v1.5H4a4 4 0 0 1 0-8h6.5L8.5 1.5 9.5 1z" />
                                        </svg>
                                        ピン留め
                                    </span>
                                )}
                                {announcement.course && (
                                    <span className={styles.courseBadge}>
                                        {announcement.course.title}
                                    </span>
                                )}
                                <span className={styles.date}>
                                    {new Date(announcement.created_at).toLocaleDateString('ja-JP', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>

                            <h2 className={styles.cardTitle}>{announcement.title}</h2>
                            <p className={styles.cardContent}>{announcement.content}</p>

                            <div className={styles.cardFooter}>
                                <div className={styles.author}>
                                    <div className={styles.authorAvatar}>
                                        {announcement.author?.avatar_url ? (
                                            <img src={announcement.author.avatar_url} alt="" />
                                        ) : (
                                            announcement.author?.full_name?.[0] || '?'
                                        )}
                                    </div>
                                    <span>{announcement.author?.full_name || '不明'}</span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}
