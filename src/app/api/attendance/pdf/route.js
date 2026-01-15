
import { NextResponse } from 'next/server'
import { generateAttendancePDF } from '@/lib/export/puppeteerPdfGenerator'

export async function POST(request) {
    try {
        const body = await request.json()
        const { student, history, currentStats } = body

        if (!student || !history) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
        }

        const buffer = await generateAttendancePDF({ student, history, currentStats })

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="attendance_${student.id}.pdf"`
            }
        })
    } catch (error) {
        console.error('PDF Generation Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
