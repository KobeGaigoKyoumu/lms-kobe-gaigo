import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

// Initialize Admin Client for bypassing RLS when needed (especially for student access)
// We reuse the service key strategy found in other API routes for consistency with existing codebase patterns
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
// Using the same service key as seen in src/app/api/attendance/route.js
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const targetStudentId = searchParams.get('studentId')

        // 1. Identify User (Teacher vs Student)
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        // 2. Authorization Check
        let effectiveStudentId = null

        if (teacherUser) {
            // Teacher: Can view any student's messages
            effectiveStudentId = targetStudentId
        } else if (studentSession) {
            // Student: Can ONLY view their own messages
            // Re-verify that targetStudentId matches session if provided, or just defaults to session
            if (targetStudentId && targetStudentId !== studentSession.studentId) {
                return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
            }
            effectiveStudentId = studentSession.studentId
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!effectiveStudentId) {
            return NextResponse.json({ error: 'Missing student ID' }, { status: 400 })
        }

        // 3. Fetch Messages
        const { data, error } = await adminSupabase
            .from('messages')
            .select('*')
            .eq('student_id', effectiveStudentId)
            .order('created_at', { ascending: true })

        if (error) throw error

        return NextResponse.json({ messages: data })

    } catch (error) {
        console.error('Chat API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { content, studentId } = body

        if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 })

        // 1. Identify User
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        let payload = null

        // 2. Construct Payload based on Role
        if (teacherUser) {
            if (!studentId) return NextResponse.json({ error: 'Target student required' }, { status: 400 })

            payload = {
                student_id: studentId,
                teacher_id: teacherUser.id,
                sender_type: 'teacher',
                content: content,
                read: false
            }
        } else if (studentSession) {
            payload = {
                student_id: studentSession.studentId,
                teacher_id: null, // Students don't send TO a specific teacher ID usually, just to the "system/school"
                sender_type: 'student',
                content: content,
                read: false
            }
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 3. Insert Message
        const { data, error } = await adminSupabase
            .from('messages')
            .insert([payload])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ message: data })

    } catch (error) {
        console.error('Chat Send Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
