import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { getKanbanColumns, getKanbanCards, getKanbanLabels, getAllKanbanReminders } from '@/app/actions/kanban'
import styles from './page.module.css'
import KanbanBoard from './KanbanBoard'

export default async function KanbanPage() {
    // Check for admin/teacher session (cookie-based only for better CPU performance)
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    // Use 'admin' as userId to signify an admin session
    const userId = 'admin'

    // Restore server-side fetching with aggressive caching (Service Role)
    // This allows the data to be visible while keeping Vercel active CPU time minimal
    const [columns, cards, labels, reminders] = await Promise.all([
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
                initialColumns={columns.data || []}
                initialCards={cards.data || []}
                initialLabels={labels.data || []}
                initialReminders={reminders.data || []}
            />
        </div>
    )
}
