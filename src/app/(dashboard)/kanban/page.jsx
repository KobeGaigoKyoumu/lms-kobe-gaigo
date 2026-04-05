import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import styles from './page.module.css'
import KanbanBoard from './KanbanBoard'
import { getKanbanColumns, getKanbanCards, getKanbanLabels, getAllKanbanReminders } from '@/app/actions/kanban'

export default async function KanbanPage() {
    // Check for admin/teacher session (cookie-based only for better CPU performance)
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    const userId = adminMember.memberId
    const userName = adminMember.name

    // Fetch all board data in a single server-side context to maximize efficiency
    const [
        { data: initialColumns },
        { data: initialCards },
        { data: initialLabels },
        { data: initialReminders }
    ] = await Promise.all([
        getKanbanColumns(),
        getKanbanCards(),
        getKanbanLabels(),
        getAllKanbanReminders()
    ])

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
                initialColumns={initialColumns || []}
                initialCards={initialCards || []}
                initialLabels={initialLabels || []}
                initialReminders={initialReminders || []}
            />
        </div>
    )
}
