import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import styles from './page.module.css'
import KanbanBoard from './KanbanBoard'

// Removed force-dynamic to allow potential static optimization
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

    // Data fetching moved to client-side (KanbanBoard.jsx) to save Vercel CPU

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>カンバンボード</h1>
                    <p className={styles.subtitle}>タスクとスケジュールの管理</p>
                </div>
            </header>
            <KanbanBoard userId={userId} />
        </div>
    )
}
