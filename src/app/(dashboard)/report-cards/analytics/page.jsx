import AnalyticsDashboard from './AnalyticsDashboard'
import { fetchJlptAnalyticsData } from '@/app/actions/jlpt'
import { fetchGradeAnalytics } from '@/app/actions/gradeAnalytics'
import careerStatsData from '@/data/career_stats_v2.json'

export const metadata = {
    title: '成績・進路分析 | LMS',
    description: '学生の学力推移と進路実績の多角的な分析ダッシュボード',
}

export default async function AnalyticsPage() {
    // Parallel fetching for performance
    const [gradeResult, jlptResult] = await Promise.all([
        fetchGradeAnalytics(),
        fetchJlptAnalyticsData()
    ])

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
