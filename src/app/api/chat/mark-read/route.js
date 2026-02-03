import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request) {
    try {
        const body = await request.json()
        const { studentId } = body

        // 1. Identify User
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        // 2. Update 'read' status
        let query = adminSupabase.from('messages').update({ read: true }).eq('read', false)

        if (teacherUser) {
            // Teacher is reading STUDENT messages
            query = query
                .eq('student_id', studentId)
                .eq('sender_type', 'student')
        } else if (studentSession) {
            // Student is reading TEACHER messages
            query = query
                .eq('student_id', studentSession.studentId) // Ensure they only affect their own
                .eq('sender_type', 'teacher')
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { error } = await query

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Mark Read Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
