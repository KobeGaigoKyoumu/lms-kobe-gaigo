import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStudentSession } from '@/app/actions/studentAuth'
import { getUnreadCount } from '@/app/actions/messageActions'

export async function GET() {
    try {
        const supabaseAuth = await createClient() // For User Auth
        // Use Service Role to bypass RLS for data fetching
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        // 1. Identify User
        const { data: { user } } = await supabaseAuth.auth.getUser()
        const studentSession = await getStudentSession()

        if (!user && !studentSession) {
            return NextResponse.json({
                hasNewAnnouncement: false,
                unsubmittedAssignmentCount: 0,
                unreadMessageCount: 0
            })
        }

        // 2. Try RPC (single query) for student status
        if (studentSession) {
            // Fetch fresh class name
            const { data: student } = await supabaseAdmin
                .from('students')
                .select('class_name')
                .eq('student_id_text', studentSession.studentId)
                .single()

            const className = student ? student.class_name?.trim() : studentSession.className?.trim()

            // Try RPC function (1 query instead of 4-5)
            const { data: rpcResult, error: rpcError } = await supabaseAdmin
                .rpc('get_student_status', {
                    p_student_id: studentSession.studentId,
                    p_class_name: className || ''
                })

            if (!rpcError && rpcResult) {
                return NextResponse.json({
                    hasNewAnnouncement: rpcResult.has_new_announcement || false,
                    unsubmittedAssignmentCount: rpcResult.unsubmitted_assignment_count || 0,
                    unreadMessageCount: rpcResult.unread_message_count || 0
                })
            }

            // Fallback: RPC not available, use original multi-query approach
            console.warn('RPC fallback: get_student_status not available, using multi-query', rpcError?.message)
        }

        // Fallback: original multi-query approach (for teachers or if RPC fails)
        const unreadMessageCount = await getUnreadCount()

        let unsubmittedAssignmentCount = 0
        if (studentSession) {
            const className = studentSession.className?.trim()
            const { data: assignments } = await supabaseAdmin
                .from('homework_assignments')
                .select('id')
                .eq('class_name', className)

            const assignmentIds = assignments?.map(a => a.id) || []

            if (assignmentIds.length > 0) {
                const { data: submissions } = await supabaseAdmin
                    .from('homework_submissions')
                    .select('assignment_id, status')
                    .eq('student_id_text', studentSession.studentId)
                    .in('assignment_id', assignmentIds)

                const submissionMap = new Map()
                submissions?.forEach(s => submissionMap.set(s.assignment_id, s.status))

                unsubmittedAssignmentCount = assignmentIds.filter(id => {
                    const status = submissionMap.get(id)
                    return !status || status === 'returned'
                }).length
            }
        }

        // Announcements
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

        const { data: announcements } = await supabaseAdmin
            .from('announcements')
            .select('target_type, target_grade, target_class, target_student_ids')
            .gte('created_at', threeDaysAgo.toISOString())

        let hasNewAnnouncement = false
        if (announcements && announcements.length > 0) {
            const className = studentSession?.className
            const academicYear = studentSession?.academicYear

            hasNewAnnouncement = announcements.some(ann => {
                if (!ann.target_type || ann.target_type === 'all') return true
                if (!studentSession) return false

                if (ann.target_type === 'grade') {
                    const currentYear = new Date().getFullYear()
                    const isBeforeApril = new Date().getMonth() < 3
                    const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
                    const studentGrade = academicYearBase - academicYear + 1
                    return String(studentGrade) === ann.target_grade
                }
                if (ann.target_type === 'class') return ann.target_class === className
                if (ann.target_type === 'individual') return ann.target_student_ids?.includes(studentSession.studentId)
                return false
            })
        }

        return NextResponse.json({
            hasNewAnnouncement,
            unsubmittedAssignmentCount,
            unreadMessageCount
        })

    } catch (error) {
        console.error('Status API Error:', error)
        return NextResponse.json({
            hasNewAnnouncement: false,
            unsubmittedAssignmentCount: 0,
            unreadMessageCount: 0,
            error: error.message
        }, { status: 500 })
    }
}
