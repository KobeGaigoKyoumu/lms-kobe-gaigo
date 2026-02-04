'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

// Reuse the service key approach from api/chat/route.js for admin access
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function getUnreadCount() {
    try {
        // 1. Identify User
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        let countQuery = adminSupabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('read', false)

        if (teacherUser) {
            // Teacher/Admin: Count all unread messages from students
            countQuery = countQuery.eq('sender_type', 'student')
        } else if (studentSession) {
            // Student: Count unread messages from teachers
            countQuery = countQuery
                .eq('student_id', studentSession.studentId)
                .eq('sender_type', 'teacher')
        } else {
            return 0
        }

        const { count, error } = await countQuery

        if (error) {
            console.error('Error fetching unread count:', error)
            return 0
        }

        return count || 0
    } catch (error) {
        console.error('Server Action Error:', error)
        return 0
    }
}
