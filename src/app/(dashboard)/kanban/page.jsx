import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import KanbanBoard from './KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function KanbanPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'

    if (!isTeacherOrAdmin) redirect('/')

    // Fetch columns
    const { data: columns } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position', { ascending: true })

    // Fetch cards
    const { data: cards } = await supabase
        .from('kanban_cards')
        .select('*')
        .order('position', { ascending: true })

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>カンバンボード</h1>
                    <p className={styles.subtitle}>タスクとスケジュールの管理</p>
                </div>
            </header>
            <KanbanBoard
                initialColumns={columns || []}
                initialCards={cards || []}
                userId={user.id}
            />
        </div>
    )
}
