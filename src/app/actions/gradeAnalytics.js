'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'

// Internal fetch function using Service Role (No Cookies) for Caching
async function getGradeAnalyticsData() {
    console.log('Cache MISS: Fetching Grade Analytics from DB (Admin Client)...')

    // Use Service Role to bypass RLS and Cookie requirements inside unstable_cache
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    try {
        const { data, error } = await supabase
            .from('grade_records')
            .select('id, student_id_text, student_name, class_name, year_term, final_exam_total, report_card_total, final_exam_data, report_card_data')
            .order('year_term', { ascending: false })

        if (error) throw error

        // Filter out JLPT data on the server side to reduce payload
        const filteredData = (data || []).filter(item => {
            const isJlptTerm = item.year_term?.startsWith('JLPT')
            const isJlptType = item.final_exam_data?.type === 'JLPT'
            return !isJlptTerm && !isJlptType
        })

        console.log(`Server Action: Fetched and filtered ${filteredData.length} grade records.`)
        return { data: filteredData }
    } catch (error) {
        console.error('Grade Analytics Fetch Error:', error)
        return { error: error.message }
    }
}

// Cache the grade analytics data for 1 hour
// Key: 'grade-analytics-v3' (Force refresh)
const getCachedGradeAnalytics = unstable_cache(
    getGradeAnalyticsData,
    ['grade-analytics-v3'],
    { tags: ['grade-records', 'grade-analytics'] }
)

export async function fetchGradeAnalytics() {
    // 1. Verify Auth (Security Check)
    const session = await getAdminMemberSession()

    if (!session) {
        console.error('Unauthorized access to Grade Analytics')
        return { error: 'Unauthorized' }
    }

    const result = await getCachedGradeAnalytics()

    if (result && !result.error && result.data) {
        try {
            const { pushCloudflareSnapshot } = await import('./cloudflare');
            await pushCloudflareSnapshot('grades', result);
        } catch (e) {
            console.error('Proactive grades snapshot push failed:', e);
        }
    }

    return result || { data: [], error: 'No data returned' }
}
