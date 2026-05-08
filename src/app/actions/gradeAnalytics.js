'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAdminMemberSession } from './adminAuth'
import { pushCloudflareSnapshot } from './cloudflare'

/**
 * Internal core logic for Grade Analytics.
 * Fetches directly from Supabase (Cloudflare KV is used on the client side via GET).
 */
async function getGradeAnalyticsDataInternal() {
    console.log('[GradeAnalytics] Fetching from Supabase...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[GradeAnalytics] Missing Supabase environment variables')
        return { error: 'Missing Supabase environment variables', data: [] }
    }

    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

    try {
        const { data, error } = await supabase
            .from('grade_records')
            .select('id, student_id_text, student_name, class_name, year_term, final_exam_total, report_card_total, final_exam_data, report_card_data')
            .order('year_term', { ascending: false })

        if (error) {
            console.error('[GradeAnalytics] Supabase query error:', error)
            throw error
        }

        console.log(`[GradeAnalytics] Fetched ${data?.length || 0} raw records from Supabase`)

        const filteredData = (data || []).filter(item => {
            const isJlptTerm = item.year_term?.startsWith('JLPT')
            const isJlptType = item.final_exam_data?.type === 'JLPT'
            return !isJlptTerm && !isJlptType
        })

        console.log(`[GradeAnalytics] Filtered to ${filteredData.length} grade records`)

        return { data: filteredData }
    } catch (error) {
        console.error('[GradeAnalytics] DB Fetch Error:', error)
        return { error: error.message, data: [] }
    }
}

export async function getGradeAnalyticsData(session) {
    if (!session) return { error: 'Unauthorized', data: [] }
    
    const result = await getGradeAnalyticsDataInternal()

    // Non-blocking: push to Cloudflare for future client-side reads
    if (result && !result.error && result.data?.length > 0) {
        try {
            await pushCloudflareSnapshot('grades_v4', result)
        } catch (e) {
            console.error('[GradeAnalytics] Snapshot push failed (non-critical):', e)
        }
    }

    return result
}

export async function fetchGradeAnalytics() {
    const session = await getAdminMemberSession()
    return getGradeAnalyticsData(session)
}
