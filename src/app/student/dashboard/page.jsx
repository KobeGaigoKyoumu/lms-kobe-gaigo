import { getStudentDashboardDataCached } from '@/app/actions/dashboard'
import { getStudentAssignments } from '@/app/actions/homework'
import { getStudentUpcomingBookings } from '@/app/actions/interview'
import StudentDashboardClient from './StudentDashboardClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic' // Keep metadata dynamic but use cached actions inside

export default async function StudentDashboardPage() {
    const data = await getStudentDashboardDataCached()
    const allAssignmentsData = await getStudentAssignments()
    const interviewResult = await getStudentUpcomingBookings().catch(() => ({ success: false, slots: [] }))

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
        announcements: data.content.announcements || [],
        upcomingInterviews: interviewResult.success ? interviewResult.slots : []
    }

    return <StudentDashboardClient initialData={adaptedData} />
}
