import { logoutStudent, getStudentSession } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import MobileMenu from '@/components/layout/MobileMenu'
import styles from './layout.module.css'
import { StudentStatusProvider } from '@/context/StudentStatusContext'

export default async function StudentLayout({ children }) {
    const session = await getStudentSession()

    if (!session) {
        redirect('/login')
    }

    return (
        <StudentStatusProvider role="student" user={session}>
            <div className={styles.wrapper}>
                <Sidebar user={session} role="student" dashboardHref="/student/dashboard" hideOnMobile={true} />

                <div className={styles.contentWrapper}>
                    {/* Header */}
                    <header className={styles.header}>
                        <div className={styles.headerContent}>
                            <Link href="/student/dashboard" className={styles.brand}>
                                神戸外語 LMS
                            </Link>
                            <div className={styles.userArea}>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>{session.name}</span> さん
                                    <span className={styles.className}>({session.className})</span>
                                </div>
                                <form action={logoutStudent}>
                                    <button className={styles.logoutButton}>
                                        ログアウト
                                    </button>
                                </form>
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className={styles.main}>
                        <MobileMenu role="student" user={session} />
                        {children}
                    </main>
                </div>
            </div>
        </StudentStatusProvider>
    )
}
