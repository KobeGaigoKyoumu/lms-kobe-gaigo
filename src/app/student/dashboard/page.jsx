import { getStudentDashboardDataCached } from '@/app/actions/dashboard'
import { getStudentAssignments } from '@/app/actions/homework'
import StudentDashboardClient from './StudentDashboardClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic' // Keep metadata dynamic but use cached actions inside

export default async function StudentDashboardPage() {
    const data = await getStudentDashboardDataCached()
    const allAssignmentsData = await getStudentAssignments()

    if (!data) {
        redirect('/login')
    }

    // Adapt data format for the client component
    const adaptedData = {
        session: data.session,
        stats: data.content.stats,
        assignments: { 
            active: allAssignmentsData.active || [], 
            archived: allAssignmentsData.archived || [] 
        },
        announcements: data.content.announcements || []
    }

    return <StudentDashboardClient initialData={adaptedData} />
}
