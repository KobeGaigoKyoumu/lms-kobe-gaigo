'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAdminMemberSession } from './adminAuth'
import { pushCloudflareSnapshot } from './cloudflare'
import { getEnhancedJlptStats } from '@/lib/jlpt'

/**
 * Internal core logic for JLPT Analytics.
 * Fetches directly from Supabase (Cloudflare KV is used on the client side via GET).
 */
async function getJlptAnalyticsDataInternal() {
    console.log('[JlptAnalytics] Fetching from Supabase...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[JlptAnalytics] Missing Supabase environment variables')
        return { error: 'Missing Supabase environment variables', stats: [] }
    }

    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

    try {
        // We need all grade records for the heavy calculation
        const { data: gradeRecords, error: gError } = await supabase
            .from('grade_records')
            .select('*')

        if (gError) {
            console.error('[JlptAnalytics] grade_records query error:', gError)
            throw gError
        }

        console.log(`[JlptAnalytics] Fetched ${gradeRecords?.length || 0} grade records`)

        // Also need student info for nationality breakdown
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('*')

        if (sError) {
            console.error('[JlptAnalytics] students query error:', sError)
            throw sError
        }

        console.log(`[JlptAnalytics] Fetched ${students?.length || 0} students`)

        // Perform the heavy calculation using the verified lib function
        const result = await getEnhancedJlptStats(students || []);
        
        console.log('[JlptAnalytics] Enhanced stats calculated successfully')

        // Ensure result is serializable for Next.js
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error('[JlptAnalytics] Internal Error:', error);
        return { error: error.message, stats: [] };
    }
}

export async function getJlptAnalyticsData(session) {
    if (!session) return { error: 'Unauthorized', stats: [] }

    console.log('[JlptAnalytics] Retrieving data...');
    const result = await getJlptAnalyticsDataInternal();

    // Non-blocking: push to Cloudflare for future client-side reads
    if (result && !result.error) {
        try {
            await pushCloudflareSnapshot('jlpt_v4', result);
        } catch (e) {
            console.error('[JlptAnalytics] Snapshot push failed (non-critical):', e);
        }
    }

    return result;
}

/**
 * Server Action for client-side
 */
export async function fetchJlptAnalyticsData() {
    const session = await getAdminMemberSession()
    return getJlptAnalyticsData(session)
}
