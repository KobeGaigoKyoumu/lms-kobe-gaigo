import { NextResponse } from 'next/server'
import { getStudentAssignments } from '@/app/actions/homework'
import { getStudentSession } from '@/app/actions/studentAuth'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { normalizeClassName } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing env for admin client in dashboard API')
        return null
    }
    return createSupabaseAdmin(supabaseUrl, supabaseServiceKey)
}

export async function GET() {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient() || supabase
        const session = await getStudentSession()

        if (!session) {
            console.warn('[DEBUG] Dashboard API: No session found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log(`[DEBUG] Dashboard API: Fetching for Student=${session.studentId}, Class=${session.className}, Grade=${session.academicYear}`)

        const [assignments, announcementsResult, enrollmentsResult] = await Promise.all([
            getStudentAssignments(),
            adminSupabase
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
                    sender_name,
                    author:profiles!author_id (full_name)
                `)
                .order('created_at', { ascending: false })
                .order('is_pinned', { ascending: false })
                .limit(50),
            adminSupabase
                .from('enrollments')
                .select('course_id')
                .eq('student_id', session.studentId)
        ])

        const announcements = announcementsResult.data || []
        const studentCourseIds = enrollmentsResult.data?.map(e => e.course_id) || []
        console.log(`[DEBUG] Dashboard API: Student is enrolled in ${studentCourseIds.length} courses.`)

        // Announcement Filtering
        const filteredAnnouncements = announcements.filter(ann => {
            let match = false
            if (!ann.target_type || ann.target_type === 'all') {
                match = true
            } else if (ann.target_type === 'grade') {
                if (session.academicYear) {
                    const currentYear = new Date().getFullYear()
                    const isBeforeApril = new Date().getMonth() < 3
                    const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
                    const studentGrade = academicYearBase - session.academicYear + 1
                    match = String(studentGrade) === ann.target_grade
                }
            } else if (ann.target_type === 'class') {
                match = normalizeClassName(ann.target_class) === normalizeClassName(session.className)
            } else if (ann.target_type === 'individual') {
                match = ann.target_student_ids?.includes(session.studentId)
            }

            // Also check Course ID (consistent with announcements list page)
            if (!match && ann.course_id && studentCourseIds.includes(ann.course_id)) {
                match = true
                console.log(`    [MATCH] "${ann.title}" matched by Course ID: ${ann.course_id}`)
            }

            console.log(`  [FILTER] "${ann.title}" (Type: ${ann.target_type}, Target: ${ann.target_class || ann.target_grade || ann.course_id || '-'}) -> Match: ${match}`)
            return match
        }).slice(0, 3)

        console.log(`[DEBUG] Dashboard API: ${filteredAnnouncements.length} announcements matched.`)
        const authorIdsWithNoProfiles = filteredAnnouncements
            .filter(ann => !ann.author?.full_name && ann.author_id)
            .map(ann => ann.author_id)
        
        if (authorIdsWithNoProfiles.length > 0) {
            const { data: admins } = await supabase
                .from('admin_members')
                .select('id, name')
                .in('id', authorIdsWithNoProfiles)
            
            if (admins) {
                const adminMap = new Map(admins.map(a => [a.id, a.name]))
                filteredAnnouncements.forEach(ann => {
                    if (adminMap.has(ann.author_id)) {
                        ann.admin_author_name = adminMap.get(ann.author_id)
                    }
                })
            }
        }

        console.log(`[DEBUG] API Response for student: ${session.studentId}, class: ${session.className}`)
        console.log(`[DEBUG] Assignments: Active=${assignments?.active?.length || 0}, Archived=${assignments?.archived?.length || 0}`)

        return NextResponse.json({
            session,
            assignments: assignments || { active: [], archived: [] },
            announcements: filteredAnnouncements
        })
    } catch (error) {
        console.error('API Error fetching dashboard data:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
