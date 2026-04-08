import styles from './layout.module.css'
// import Sidebar from '@/components/layout/Sidebar'
// import MobileMenu from '@/components/layout/MobileMenu'
// import SystemChatWidget from '@/components/system-chat/SystemChatWidget'
import { redirect } from 'next/navigation'
// import { StudentStatusProvider } from '@/context/StudentStatusContext'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export const dynamic = 'force-dynamic'
// revalidate = 30 removed to reduce CPU load. Dynamic data is fetched on demand or with longer cache.

export default async function DashboardLayout({ children }) {
    // Check for admin/teacher session (cookie-based only for better CPU performance)
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    // Role, name, and ID are derived directly from the cookie session
    const userRole = adminMember.role || 'teacher'
    const userId = adminMember.memberId || 'member'
    const userName = adminMember.name
    const userEmail = `${adminMember.name}@member`
    const userAvatar = '' // No more Google avatar, can be added to admin_members table later if needed

    return (
        <div style={{ padding: '20px' }}>
            <main>
                {children}
            </main>
        </div>
    )
}


