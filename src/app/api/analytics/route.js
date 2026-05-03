import { NextResponse } from 'next/server'
import { getGradeAnalyticsData } from '@/app/actions/gradeAnalytics'
import { getJlptAnalyticsData } from '@/app/actions/jlpt'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export async function GET(request) {
    try {
        const session = await getAdminMemberSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')

        if (type === 'grades') {
            const result = await getGradeAnalyticsData(session)
            return NextResponse.json(result)
        }

        if (type === 'jlpt') {
            const result = await getJlptAnalyticsData(session)
            return NextResponse.json(result)
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

    } catch (error) {
        console.error('Analytics API Route Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
