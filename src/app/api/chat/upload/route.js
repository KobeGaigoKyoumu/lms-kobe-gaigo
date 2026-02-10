import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

export async function POST(request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // 1. Auth Check
        const supabase = await createClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        if (!teacherUser && !studentSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        // Create a unique file name to prevent collisions
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const bucketName = 'chat-attachments'

        const { data, error } = await supabase
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
        const { data: { publicUrl } } = supabase
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
