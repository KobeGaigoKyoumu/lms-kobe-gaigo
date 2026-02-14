import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileMenu from '@/components/layout/MobileMenu'
import styles from './layout.module.css'

export default async function DashboardLayout({ children }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch user role server-side for performance
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const userRole = profile?.role

    // Safety: If a student somehow ends up in the teacher layout, send them to the student portal
    if (userRole === 'student') {
        redirect('/student/dashboard')
    }

    return (
        <div className={styles.wrapper}>
            <Sidebar user={user} role={userRole} hideOnMobile={true} />
            <main className={styles.main}>
                <MobileMenu role={userRole} user={user} />
                {children}
            </main>
        </div>
    )
}
