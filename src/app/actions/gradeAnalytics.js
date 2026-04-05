'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'
import { pushCloudflareSnapshot } from './cloudflare'

/**
 * Internal core logic for Grade Analytics.
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

        const filteredData = (data || []).filter(item => {
            const isJlptTerm = item.year_term?.startsWith('JLPT')
            const isJlptType = item.final_exam_data?.type === 'JLPT'
            return !isJlptTerm && !isJlptType
        })

        return { data: filteredData }
    } catch (error) {
        console.error('Grade Analytics DB Fetch Error:', error)
        return { error: error.message }
    }
}

const getCachedGradeAnalytics = unstable_cache(
    getGradeAnalyticsDataInternal,
    ['grade-analytics-v3'],
    { tags: ['grade-records', 'grade-analytics'], revalidate: 3600 }
)

export async function getGradeAnalyticsData(session) {
    if (!session) return { error: 'Unauthorized' }
    
    const result = await getCachedGradeAnalytics()

    if (result && !result.error && result.data) {
        try {
            await pushCloudflareSnapshot('grades', result)
        } catch (e) {
            console.error('Snapshot push failed (non-critical):', e)
        }
    }

    return result || { data: [], error: 'No data returned' }
}

export async function fetchGradeAnalytics() {
    const session = await getAdminMemberSession()
    return getGradeAnalyticsData(session)
}
