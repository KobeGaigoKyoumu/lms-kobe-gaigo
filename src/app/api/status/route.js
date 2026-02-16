import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'
import { getUnreadCount } from '@/app/actions/messageActions'

export async function GET() {
    try {
        const supabase = await createClient()

        // 1. Identify User
        const { data: { user } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        if (!user && !studentSession) {
            return NextResponse.json({
                hasNewAnnouncement: false,
                unsubmittedAssignmentCount: 0,
                unreadMessageCount: 0
            })
        }

        // 2. Unread Messages
        const unreadMessageCount = await getUnreadCount()

        // 3. Assignments (Student logic only)
        let unsubmittedAssignmentCount = 0
        let assignmentIds = [] // Fix scope issue

        if (studentSession) {
            // Fetch fresh student profile to ensure class name is up to date
            const { data: student } = await supabase
                .from('students')
                .select('class_name')
                .eq('student_id_text', studentSession.studentId)
                .single()

            const className = student ? student.class_name?.trim() : studentSession.className?.trim()

            const { data: assignments } = await supabase
                .from('homework_assignments')
                .select('id')
                .eq('class_name', className)

            assignmentIds = assignments?.map(a => a.id) || []

            if (assignmentIds.length > 0) {
                const { data: submissions } = await supabase
                    .from('homework_submissions')
                    .select('assignment_id, status')
                    .eq('student_id_text', studentSession.studentId)
                    .in('assignment_id', assignmentIds)

                // Map assignment ID to status
                const submissionMap = new Map()
                submissions?.forEach(s => submissionMap.set(s.assignment_id, s.status))

                // Count if (not submitted) OR (status is 'returned')
                const debugDetails = []
                unsubmittedAssignmentCount = assignmentIds.filter(id => {
                    const status = submissionMap.get(id)
                    const isUnsubmitted = !status || status === 'returned'
                    debugDetails.push({ id, status, isUnsubmitted })
                    return isUnsubmitted
                }).length

                console.log('Debug Status API - Detailed:', {
                    studentId: studentSession.studentId,
                    className: studentSession.className,
                    assignmentCount: assignmentIds.length,
                    details: debugDetails.slice(0, 5) // Log first 5 for sanity
                })
            }
        }

        // 4. Announcements
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

        const { data: announcements } = await supabase
            .from('announcements')
            .select('target_type, target_grade, target_class, target_student_ids')
            .gte('created_at', threeDaysAgo.toISOString())

        let hasNewAnnouncement = false
        if (announcements && announcements.length > 0) {
            const studentId = studentSession?.studentId
            const className = studentSession?.className
            const academicYear = studentSession?.academicYear

            hasNewAnnouncement = announcements.some(ann => {
                if (!ann.target_type || ann.target_type === 'all') return true
                if (!studentSession) return false // Non-students only see 'all'

                if (ann.target_type === 'grade') {
                    const currentYear = new Date().getFullYear()
                    const isBeforeApril = new Date().getMonth() < 3
                    const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
                    const studentGrade = academicYearBase - academicYear + 1
                    return String(studentGrade) === ann.target_grade
                }
                if (ann.target_type === 'class') return ann.target_class === className
                if (ann.target_type === 'individual') return ann.target_student_ids?.includes(studentId)
                return false
            })
        }

        return NextResponse.json({
            hasNewAnnouncement,
            unsubmittedAssignmentCount,
            unreadMessageCount,
            debug: {
                studentId: studentSession?.studentId,
                className: studentSession?.className,
                classNameTrimmed: studentSession?.className?.trim(),
                assignmentCount: assignmentIds?.length || 0,
                // debugDetails: debugDetails // Too large for prod response usually, but ok for now if needed?
                // simplified details
                assignmentsFound: assignmentIds?.length,
                count: unsubmittedAssignmentCount
            }
        })

    } catch (error) {
        console.error('Status API Error:', error)
        return NextResponse.json({
            hasNewAnnouncement: false,
            unsubmittedAssignmentCount: 0,
            unreadMessageCount: 0
        }, { status: 500 })
    }
}
