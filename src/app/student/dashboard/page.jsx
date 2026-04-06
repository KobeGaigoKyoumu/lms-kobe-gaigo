import { getStudentDashboardDataCached } from '@/app/actions/dashboard'
import StudentDashboardClient from './StudentDashboardClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic' // Keep metadata dynamic but use cached actions inside

export default async function StudentDashboardPage() {
    const data = await getStudentDashboardDataCached()

    if (!data) {
        redirect('/login')
    }

    // Adapt data format for the client component
    const adaptedData = {
        session: data.session,
        stats: data.content.stats,
        assignments: { 
            active: data.content.recentAssignments || [], 
            archived: [] 
        },
        announcements: data.content.announcements || []
    }

    return <StudentDashboardClient initialData={adaptedData} />
}
