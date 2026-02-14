
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

        // 譛譁ｰ縺ｮ蟷ｴ譛医ｒ蜿門ｾ暦ｼ域怦蛻･繝・・繧ｿ縺九ｉ・・        const monthlyData = history.monthlyData || []
        let latestYear = new Date().getFullYear()
        let latestMonth = new Date().getMonth() + 1
        if (monthlyData.length > 0) {
            // 譛譁ｰ繝・・繧ｿ繧貞叙蠕・            const sorted = [...monthlyData].sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
            latestYear = sorted[0].year
            latestMonth = sorted[0].month
        }

        // 繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・: 繧ｯ繝ｩ繧ｹ蜷浩蟄ｦ逕溷錐_縲・ｹｴ縲・怦蜃ｺ蟶ｭ邇・pdf
        const className = student.className || ''
        const studentName = student.name || student.id
        const fileName = `${className}_${studentName}_${latestYear}蟷ｴ${latestMonth}譛亥・蟶ｭ邇・pdf`
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
