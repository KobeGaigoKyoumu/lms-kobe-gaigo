import AnalyticsDashboard from './AnalyticsDashboard'
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

    console.log('AnalyticsPage: Rendering for admin:', adminMember.name)

    // Pass only the static careerStatsData. Heavy analytics data (grades, jlpt) 
    // is now fetched on the client side via Cloudflare to minimize Vercel bandwidth limits.
    return (
        <AnalyticsDashboard 
            initialCareerStats={careerStatsData}
        />
    )
}
