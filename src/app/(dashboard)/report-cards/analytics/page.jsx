import AnalyticsDashboard from './AnalyticsDashboard'
import { getJlptAnalyticsData } from '@/app/actions/jlpt'
import { getGradeAnalyticsData } from '@/app/actions/gradeAnalytics'
import careerStatsData from '@/data/career_stats_v2.json'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { redirect } from 'next/navigation'

export const metadata = {
    title: '成績・進路分析 | LMS',
    description: '学生の学力推移と進路実績の多角的な分析ダッシュボード',
}

/**
 * Internal logic for JLPT Analytics, can be called from Server Components safely.
 */
export async function getJlptAnalyticsData(session) {
    if (!session) return { error: 'Unauthorized' }

    console.log('getJlptAnalyticsData: Fetching Data...');
    const result = await getCachedAnalytics();

    // Proactively push to Cloudflare KV for the frontend to use if not error
    if (result && !result.error) {
        try {
            const { pushCloudflareSnapshot } = await import('./cloudflare');
            await pushCloudflareSnapshot('jlpt', result);
        } catch (e) {
            console.error('Proactive snapshot push failed:', e);
        }
    }

    return result;
}

export async function fetchJlptAnalyticsData() {
    const session = await getAdminMemberSession()
    return getJlptAnalyticsData(session)
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
