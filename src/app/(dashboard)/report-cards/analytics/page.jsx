import AnalyticsDashboard from './AnalyticsDashboard'
import { getJlptAnalyticsData } from '@/app/actions/jlpt'
import { getGradeAnalyticsData } from '@/app/actions/gradeAnalytics'
import careerStatsData from '@/data/career_stats_v2.json'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { redirect } from 'next/navigation'

export const metadata = {
    title: '成績・進路分析ダッシュボード | 神戸外語 LMS',
    description: '学生の学力推移と進路実績の多角的な分析ダッシュボード',
}

export default async function AnalyticsPage() {
    // 1. Verify Administrative Session
    const adminMember = await getAdminMemberSession()
    if (!adminMember) {
        redirect('/login')
    }

    console.log('AnalyticsPage: Fetching components for admin:', adminMember.name)

    // 2. Direct internal calls (avoids Server Action context issues)
    const fetchResults = await Promise.allSettled([
        getGradeAnalyticsData(adminMember),
        getJlptAnalyticsData(adminMember)
    ])

    const gradeResult = fetchResults[0].status === 'fulfilled' ? fetchResults[0].value : { error: 'Grade fetch failed' }
    const jlptResult = fetchResults[1].status === 'fulfilled' ? fetchResults[1].value : { error: 'JLPT fetch failed' }

    return (
        <AnalyticsDashboard 
            initialGradeData={gradeResult?.data || []}
            initialJlptData={jlptResult || {}}
            initialNationalStats={jlptResult?.nationalStats || null}
            initialSectionStats={jlptResult?.sectionScores || null}
            initialCareerStats={careerStatsData}
            initialStudentDb={jlptResult?.enhanced?.allStudentStats || []}
        />
    )
}
