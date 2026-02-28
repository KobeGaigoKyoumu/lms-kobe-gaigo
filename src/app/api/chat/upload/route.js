import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

// Initialize Admin Client for bypassing RLS
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

import imagekit from '@/lib/imagekit'

export async function POST(request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // 1. Auth Check
        const authSupabase = await createServerClient()
        const { data: { user: teacherUser } } = await authSupabase.auth.getUser()
        const studentSession = await getStudentSession()

        if (!teacherUser && !studentSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Upload to ImageKit
        const buffer = Buffer.from(await file.arrayBuffer())
        const response = await imagekit.upload({
            file: buffer,
            fileName: file.name,
            folder: '/chat-attachments',
            useUniqueFileName: true,
        })

        return NextResponse.json({
            url: response.url,
            name: file.name,
            type: file.type,
            id: response.fileId,
            path: response.filePath
        })

    } catch (error) {
        console.error('ImageKit Chat Upload Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
