'use client'

import AnnouncementCard from './AnnouncementCard'
import styles from './page.module.css'
import Link from 'next/link'

export default function AnnouncementList({ adminMember, profileRole, initialAnnouncements = [], initialError = null }) {
    if (initialError) {
        return <div className={styles.error}>お知らせの取得に失敗しました: {initialError}</div>
    }

    if (initialAnnouncements.length === 0) {
        const isTeacherOrAdmin = true // Based on current logic
        return (
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
        )
    }

    return (
        <div className={styles.list}>
            {initialAnnouncements.map(announcement => (
                <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    canEdit={profileRole === 'admin' || announcement.author_id === adminMember?.memberId}
                />
            ))}
        </div>
    )
}
