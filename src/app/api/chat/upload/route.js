import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'
import { uploadFileToDrive } from '@/lib/googleDrive'

export async function POST(request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // 1. Auth Check
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        if (!teacherUser && !studentSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Upload to Google Drive
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const uploadedFile = await uploadFileToDrive(
            buffer,
            file.name,
            file.type
        )

        return NextResponse.json({
            url: uploadedFile.url,
            name: uploadedFile.name,
            type: file.type,
            id: uploadedFile.id
        })

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
