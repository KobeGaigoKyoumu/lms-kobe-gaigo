import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import styles from './layout.module.css'

export default async function DashboardLayout({ children }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className={styles.wrapper}>
            <Sidebar user={user} />
            <main className={styles.main}>
                {children}
            </main>
        </div>
    )
}
