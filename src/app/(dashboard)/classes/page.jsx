import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { fetchCachedClassesData } from '@/app/actions/classData'
import ClassesClient from './ClassesClient'

export default async function ClassesPage() {
    // Session check remains on server for security
    const adminMember = await getAdminMemberSession()

    if (!adminMember) {
        redirect('/login')
    }

    // Restore server-side fetching with aggressive caching (Service Role)
    // This allows data visibility while keeping Vercel active CPU time minimal
    const { classes, studentCounts } = await fetchCachedClassesData()

    return (
        <ClassesClient 
            adminMember={adminMember} 
            initialClasses={classes || []} 
            initialStudentCounts={studentCounts || {}} 
        />
    )
}
