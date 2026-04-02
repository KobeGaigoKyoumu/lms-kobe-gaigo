import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import ClassesClient from './ClassesClient'

export default async function ClassesPage() {
    // Session check remains on server for security, but data fetching moves to client
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    return <ClassesClient adminMember={adminMember} />
}
