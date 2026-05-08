import { redirect } from 'next/navigation'
import styles from './page.module.css'
import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { getAdminDashboardDataCached } from '@/app/actions/dashboard'
import DashboardContent from './DashboardContent'
// Triggering deployment...


export default async function DashboardPage() {
    const studentSession = await getStudentSessionLight()

    // Redirect students to their portal if they hit the root dashboard
    if (studentSession) {
        redirect('/student/dashboard')
    }

    // Fetch administrative dashboard data using a secure server action
    // This pre-fetches announcements, stats, and assignments to avoid client-side 406/401 errors
    const dashboardResult = await getAdminDashboardDataCached()

    if (!dashboardResult) {
        redirect('/login')
    }

    const { adminMember, content } = dashboardResult
    const firstName = adminMember.name || 'ユーザー'

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

            <DashboardContent 
                adminMember={adminMember} 
                initialData={content}
            />
        </div>
    )
}
