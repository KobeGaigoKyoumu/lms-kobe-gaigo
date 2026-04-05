'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'

/**
 * Internal core logic for Grade Analytics.
 * This function bypasses cookie requirements by using the Service Role.
 */
async function getGradeAnalyticsDataInternal() {
    console.log('Cache MISS: Fetching Grade Analytics from DB (Admin Client)...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Grade Analytics: Missing Supabase environment variables')
    }

    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

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

        console.log(`Grade Analytics: Fetched and filtered ${filteredData.length} records.`)
        return { data: filteredData }
    } catch (error) {
        console.error('Grade Analytics DB Fetch Error:', error)
        return { error: error.message }
    }
}

// Cache the grade analytics data for 1 hour
const getCachedGradeAnalytics = unstable_cache(
    getGradeAnalyticsDataInternal,
    ['grade-analytics-v3'],
    { tags: ['grade-records', 'grade-analytics'], revalidate: 3600 }
)

/**
 * Public function to get Grade Analytics data, safe for Server Components.
 */
export async function getGradeAnalyticsData(session) {
    if (!session) return { error: 'Unauthorized' }
    
    console.log('getGradeAnalyticsData: Retrieving cached data...')
    const result = await getCachedGradeAnalytics()

    // Optionally push to Cloudflare
    if (result && !result.error && result.data) {
        try {
            const { pushCloudflareSnapshot } = await import('../cloudflare')
            await pushCloudflareSnapshot('grades', result)
        } catch (e) {
            console.error('Proactive grades snapshot push failed:', e)
        }
    }

    return result || { data: [], error: 'No data returned' }
}

/**
 * Server Action for client-side consumption
 */
export async function fetchGradeAnalytics() {
    const session = await getAdminMemberSession()
    return getGradeAnalyticsData(session)
}
