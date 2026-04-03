import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import styles from './page.module.css'
import KanbanBoard from './KanbanBoard'

export default async function KanbanPage() {
    // Check for admin/teacher session (cookie-based only for better CPU performance)
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    const userId = adminMember.memberId
    const userName = adminMember.name

    // Offload all data fetching to the client side.
    // KanbanBoard component will detect missing initial props and fetch directly from Supabase.
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>カンバンボード</h1>
                    <p className={styles.subtitle}>タスクとスケジュールの管理</p>
                </div>
            </header>
            <KanbanBoard 
                userId={userId} 
                userName={userName}
            />
        </div>
    )
}
