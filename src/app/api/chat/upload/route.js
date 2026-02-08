import { uploadFileToDrive } from '@/lib/googleDrive'

export async function POST(request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // 1. Auth Check - Using same logic as before to verify user session
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

        return {
            success: true,
            url: uploadedFile.url,
            name: uploadedFile.name,
            type: file.type,
            path: uploadedFile.id // ID for potential future use
        }

        return NextResponse.json({
            url: uploadedFile.url,
            name: uploadedFile.name,
            type: file.type
        })

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
