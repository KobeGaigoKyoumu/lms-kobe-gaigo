
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

        // 最新の年月を取得（月別データから）
        const monthlyData = history.monthlyData || []
        let latestYear = new Date().getFullYear()
        let latestMonth = new Date().getMonth() + 1
        if (monthlyData.length > 0) {
            // 最新データを取得
            const sorted = [...monthlyData].sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
            latestYear = sorted[0].year
            latestMonth = sorted[0].month
        }

        // ファイル名を生成: クラス名_学生名_〇年〇月出席率.pdf
        const className = student.className || ''
        const studentName = student.name || student.id
        const fileName = `${className}_${studentName}_${latestYear}年${latestMonth}月出席率.pdf`
        const encodedFileName = encodeURIComponent(fileName)

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`
            }
        })
    } catch (error) {
        console.error('PDF Generation Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
