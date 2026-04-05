'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'

/**
 * Internal heavy calculation logic for JLPT Analytics.
 * Should be called inside unstable_cache or directly from Server Components.
 */
async function getJlptAnalyticsDataInternal() {
    console.log('Cache MISS: Calculating JLPT Analytics (Heavy Task)...');
    
    // Dynamically import the heavy processing logic
    const { calculateJlptStats } = await import('@/lib/jlpt');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

    try {
        const { data: gradeRecords, error } = await supabase
            .from('grade_records')
            .select('*')
            .order('year_term', { ascending: false });

        if (error) throw error;

        // Process records through the complex logic in lib/jlpt.js
        const result = await calculateJlptStats(gradeRecords || []);
        
        // Ensure result is serializable
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error('JLPT Analytics Core Error:', error);
        return { error: error.message, stats: [] };
    }
}

// Cache the JLPT analytics data for 1 hour
const getCachedAnalytics = unstable_cache(
    getJlptAnalyticsDataInternal,
    ['jlpt-analytics-v3'],
    { tags: ['jlpt-analytics'], revalidate: 3600 }
);

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
            // Note the path: this file is in src/app/actions/, cloudflare is in src/app/actions/
            const { pushCloudflareSnapshot } = await import('./cloudflare');
            await pushCloudflareSnapshot('jlpt', result);
        } catch (e) {
            console.error('Proactive snapshot push failed:', e);
        }
    }

    return result;
}

/**
 * Server Action for client-side consumption
 */
export async function fetchJlptAnalyticsData() {
    const session = await getAdminMemberSession()
    return getJlptAnalyticsData(session)
}
