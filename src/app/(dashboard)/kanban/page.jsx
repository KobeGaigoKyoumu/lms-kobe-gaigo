import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import KanbanClientWrapper from './KanbanClientWrapper'

export default async function KanbanPage() {
    // Check for admin/teacher session (cookie-based only for better CPU performance)
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    // Use 'admin' as userId to signify an admin session
    const userId = 'admin'

    // Data fetching moved to client-side (KanbanClientWrapper)
    return <KanbanClientWrapper userId={userId} />
}
