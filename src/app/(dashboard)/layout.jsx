import styles from './layout.module.css'
import Sidebar from '@/components/layout/Sidebar'
import MobileMenu from '@/components/layout/MobileMenu'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudentStatusProvider } from '@/context/StudentStatusContext'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    // Check for admin member session (cookie-based)
    const adminMember = await getAdminMemberSession()

    if (!user && !adminMember) {
        redirect('/login')
    }

    // Fetch user role server-side for performance
    let userRole = 'teacher'
    let userId = 'member'
    let userEmail = ''
    let userName = ''
    let userAvatar = ''

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        userRole = profile?.role
        userId = user.id
        userEmail = user.email
        userName = user.user_metadata?.full_name
        userAvatar = user.user_metadata?.avatar_url
    } else if (adminMember) {
        userRole = adminMember.role || 'teacher'
        userId = adminMember.memberId || 'member'
        userName = adminMember.name
        userEmail = `${adminMember.name}@member`
    }

    return (
        <StudentStatusProvider role={userRole} userId={userId}>
            <div className={styles.wrapper}>
                <Sidebar
                    role={userRole}
                    hideOnMobile={true}
                    userId={userId}
                    userEmail={userEmail}
                    userName={userName}
                    userAvatar={userAvatar}
                />
                <main className={styles.main}>
                    <MobileMenu
                        role={userRole}
                        userId={userId}
                        userEmail={userEmail}
                        userName={userName}
                        userAvatar={userAvatar}
                    />
                    {children}
                </main>
            </div>
        </StudentStatusProvider>
    )
}

