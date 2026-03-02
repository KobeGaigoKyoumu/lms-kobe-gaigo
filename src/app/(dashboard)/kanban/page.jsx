import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import styles from './page.module.css'
import KanbanBoard from './KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function KanbanPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check for admin member session (cookie-based)
    const adminMember = await getAdminMemberSession()

    if (!user && !adminMember) redirect('/login')

    // If Google user, verify role
    let userId = 'member'
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'
        if (!isTeacherOrAdmin) redirect('/')
        userId = user.id
    }

    // Use service role client for data fetching (works for both auth types)
    const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch columns
    const { data: columns } = await adminSupabase
        .from('kanban_columns')
        .select('*')
        .order('position', { ascending: true })

    // Fetch cards
    const { data: cards } = await adminSupabase
        .from('kanban_cards')
        .select('*')
        .order('position', { ascending: true })

    // Fetch labels
    const { data: labels } = await adminSupabase
        .from('kanban_labels')
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
                initialLabels={labels || []}
                userId={userId}
            />
        </div>
    )
}

