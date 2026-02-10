import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

// Initialize Admin Client for bypassing RLS
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // 1. Auth Check (still use regular client for auth verification)
        const authSupabase = await createServerClient()
        const { data: { user: teacherUser } } = await authSupabase.auth.getUser()
        const studentSession = await getStudentSession()

        if (!teacherUser && !studentSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Upload to Supabase Storage using Admin Client
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const bucketName = 'chat-attachments'

        const { data, error } = await adminSupabase
            .storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (error) {
            console.error('Supabase Upload Error:', error)
            throw new Error(`Storage Upload Failed: ${error.message}`)
        }

        // 3. Get Public URL
        const { data: { publicUrl } } = adminSupabase
            .storage
            .from(bucketName)
            .getPublicUrl(fileName)

        return NextResponse.json({
            url: publicUrl,
            name: file.name,
            type: file.type,
            id: data.path // Use the storage path as the ID
        })

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
