import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import AnnouncementList from './AnnouncementList'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { getAnnouncements } from '@/app/actions/announcements'

export default async function AnnouncementsPage() {
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    const { data: initialAnnouncements, error } = await getAnnouncements()
    const profileRole = adminMember.role
    const isTeacherOrAdmin = true

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

            <AnnouncementList 
                adminMember={adminMember} 
                profileRole={profileRole} 
                initialAnnouncements={initialAnnouncements}
                initialError={error}
            />
        </div>
    )
}
