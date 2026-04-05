import AnalyticsDashboard from './AnalyticsDashboard'
import { fetchJlptAnalyticsData } from '@/app/actions/jlpt'
import { fetchGradeAnalytics } from '@/app/actions/gradeAnalytics'
import careerStatsData from '@/data/career_stats_v2.json'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { redirect } from 'next/navigation'

export const metadata = {
    title: '成績・進路分析 | LMS',
    description: '学生の学力推移と進路実績の多角的な分析ダッシュボード',
}

export default async function AnalyticsPage() {
    // 1. Verify Administrative Session
    const adminMember = await getAdminMemberSession()
    if (!adminMember) {
        redirect('/login')
    }

    console.log('AnalyticsPage: Fetching components for admin:', adminMember.name)

    // 2. Parallel fetching with individual error handling to prevent page crash
    const fetchResults = await Promise.allSettled([
        fetchGradeAnalytics(),
        fetchJlptAnalyticsData()
    ])

    const gradeResult = fetchResults[0].status === 'fulfilled' ? fetchResults[0].value : { error: 'Grade fetch failed' }
    const jlptResult = fetchResults[1].status === 'fulfilled' ? fetchResults[1].value : { error: 'JLPT fetch failed' }

    if (gradeResult.error) console.error('AnalyticsPage: Grade Error:', gradeResult.error)
    if (jlptResult.error) console.error('AnalyticsPage: JLPT Error:', jlptResult.error)

    // National stats are optional/mocked for now as they were fetched on-demand in client
    // If there's a specific API, we could fetch it here too.
    const nationalStats = null 

    return (
        <AnalyticsDashboard 
            initialGradeData={gradeResult?.data || []}
            initialJlptData={jlptResult || {}}
            initialNationalStats={nationalStats}
            initialSectionStats={jlptResult?.sectionScores || null}
            initialCareerStats={careerStatsData}
            initialStudentDb={jlptResult?.enhanced?.allStudentStats || []}
        />
    )
}
