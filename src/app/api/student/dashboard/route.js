import { NextResponse } from 'next/server'
import { getStudentAssignments } from '@/app/actions/homework'
import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const session = await getStudentSessionLight()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const [assignments, announcementsResult] = await Promise.all([
            getStudentAssignments(),
            supabase
                .from('announcements')
                .select(`
                    id,
                    title,
                    content,
                    is_pinned,
                    created_at,
                    target_type,
                    target_grade,
                    target_class,
                    target_student_ids,
                    course_id,
                    author:profiles!author_id (full_name)
                `)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50)
        ])

        const announcements = announcementsResult.data || []

        // Announcement Filtering
        const filteredAnnouncements = announcements.filter(ann => {
            if (!ann.target_type || ann.target_type === 'all') return true

            if (ann.target_type === 'grade') {
                if (!session.academicYear) return false
                const currentYear = new Date().getFullYear()
                const isBeforeApril = new Date().getMonth() < 3
                const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
                const studentGrade = academicYearBase - session.academicYear + 1
                return String(studentGrade) === ann.target_grade
            }
            if (ann.target_type === 'class') {
                return ann.target_class === session.className
            }
            if (ann.target_type === 'individual') {
                return ann.target_student_ids?.includes(session.studentId)
            }
            return false
        }).slice(0, 3)

        return NextResponse.json({
            session,
            assignments: Array.isArray(assignments) ? assignments : [],
            announcements: filteredAnnouncements
        })
    } catch (error) {
        console.error('API Error fetching dashboard data:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
