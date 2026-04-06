import { redirect } from 'next/navigation'
import styles from './page.module.css'
import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import DashboardContent from './DashboardContent'


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

            <DashboardContent adminMember={adminMember} />
        </div>
    )
}
