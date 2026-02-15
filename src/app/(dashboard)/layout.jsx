import styles from './layout.module.css'
import Sidebar from '@/components/layout/Sidebar'
import MobileMenu from '@/components/layout/MobileMenu'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudentStatusProvider } from '@/context/StudentStatusContext'

export const dynamic = 'force-dynamic'

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

    return (
        <StudentStatusProvider role={userRole} userId={user.id}>
            <div className={styles.wrapper}>
                <Sidebar
                    role={userRole}
                    hideOnMobile={true}
                    userId={user.id}
                    userEmail={user.email}
                    userName={user.user_metadata?.full_name}
                    userAvatar={user.user_metadata?.avatar_url}
                />
                <main className={styles.main}>
                    <MobileMenu
                        role={userRole}
                        userId={user.id}
                        userEmail={user.email}
                        userName={user.user_metadata?.full_name}
                        userAvatar={user.user_metadata?.avatar_url}
                    />
                    {children}
                </main>
            </div>
        </StudentStatusProvider>
    )
}
