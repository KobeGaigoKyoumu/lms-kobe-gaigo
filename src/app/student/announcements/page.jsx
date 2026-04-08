import { getStudentAnnouncements } from '@/app/actions/announcements'
import styles from './page.module.css'
import AnnouncementCard from '@/app/(dashboard)/announcements/AnnouncementCard'

export const dynamic = 'force-dynamic'
export default async function StudentAnnouncementsPage() {
    // Fetch filtered announcements on server side (Secure & Fast)
    const { data: announcements, error } = await getStudentAnnouncements()

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>お知らせ</h1>
                    <p className={styles.subtitle}>学校からの重要なお知らせ</p>
                </div>
            </header>

            {error && (
                <div className={styles.error}>お知らせの取得に失敗しました。</div>
            )}

            {!error && (!announcements || announcements.length === 0) ? (
                <div className={styles.empty}>
                    <p>現在、お知らせはありません。</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {announcements.map(announcement => (
                        <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            canEdit={false}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
