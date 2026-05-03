'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_cache as next_unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'
import { pushCloudflareSnapshot } from './cloudflare'

/**
 * Internal core logic for Grade Analytics.
 */
async function getGradeAnalyticsDataInternal() {
    // LAYER 2: Try Cloudflare Snapshot before hitting Supabase
    try {
        console.log('Cache MISS (Next.js): Checking Cloudflare Snapshot (Grades)...')
        const snapshot = await getCloudflareSnapshot('grades_v4')
        if (snapshot && snapshot.data) {
            console.log('Cache HIT (Cloudflare): Using snapshot for grades.')
            return snapshot
        }
    } catch (e) {
        console.error('Cloudflare fetch failed for grades, falling back to DB:', e)
    }

    console.log('Cache MISS (Cloudflare): Fetching Grade Analytics from DB...')

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

// Global variable to store memoized cache function
let _cachedGradeAnalyticsFunc = null;

function getCachedGradeAnalyticsInternal() {
    if (!_cachedGradeAnalyticsFunc) {
        _cachedGradeAnalyticsFunc = next_unstable_cache(
            getGradeAnalyticsDataInternal,
            ['grade-analytics-v4'],
            { tags: ['grade-records', 'grade-analytics'], revalidate: 3600 }
        );
    }
    return _cachedGradeAnalyticsFunc();
}

export async function getGradeAnalyticsData(session) {
    if (!session) return { error: 'Unauthorized' }
    
    const result = await getCachedGradeAnalyticsInternal()

    if (result && !result.error && result.data) {
        try {
            await pushCloudflareSnapshot('grades_v4', result)
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
