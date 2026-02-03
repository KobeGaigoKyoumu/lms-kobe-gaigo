import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

// Use Service Key for Storage operations (bypassing RLS for students who aren't in Supabase Auth)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')
        const studentId = formData.get('studentId') // For organizing files

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // 1. Auth Check
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        // Organize files by student_id or 'general'
        // If teacher is uploading, they might upload to a specific student folder, or their own.
        // Let's use `student_id` passed in, or default to session.
        let targetFolderId = 'general'

        if (teacherUser) {
            targetFolderId = studentId || 'teacher-uploads'
        } else if (studentSession) {
            targetFolderId = studentSession.studentId
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Upload to Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${targetFolderId}/${fileName}`

        // Convert File to Buffer/ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data, error } = await adminSupabase
            .storage
            .from('chat-attachments')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            })

        if (error) throw error

        // 3. Get Public URL
        const { data: { publicUrl } } = adminSupabase
            .storage
            .from('chat-attachments')
            .getPublicUrl(filePath)

        return NextResponse.json({
            url: publicUrl,
            name: file.name,
            type: file.type
        })

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
