'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'
import { pushCloudflareSnapshot } from './cloudflare'
import { getEnhancedJlptStats } from '@/lib/jlpt'

/**
 * Internal core logic for JLPT Analytics.
 * This function bypasses cookie requirements by using the Service Role.
 */
async function getJlptAnalyticsDataInternal() {
    console.log('Cache MISS: Calculating JLPT Analytics (Internal Logic)...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('JLPT Analytics: Missing Supabase environment variables')
    }

    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

    try {
        // We need all grade records for the heavy calculation
        const { data: gradeRecords, error: gError } = await supabase
            .from('grade_records')
            .select('*')

        if (gError) throw gError;

        // Also need student info for nationality breakdown
        const { data: students, error: sError } = await supabase
            .from('student_master')
            .select('student_id, full_name, enrollment_date, status')

        if (sError) throw sError;

        // Perform the heavy calculation using the verified lib function
        const result = await getEnhancedJlptStats(students || []);
        
        // Ensure result is serializable for Next.js
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error('JLPT Analytics Internal Error:', error);
        return { error: error.message, stats: [] };
    }
}

// Cache the JLPT analytics data for 1 hour
const getCachedJlptAnalytics = unstable_cache(
    getJlptAnalyticsDataInternal,
    ['jlpt-analytics-v3'],
    { tags: ['jlpt-analytics'], revalidate: 3600 }
);

/**
 * Public function for Server Components
 */
export async function getJlptAnalyticsData(session) {
    if (!session) return { error: 'Unauthorized' }

    console.log('getJlptAnalyticsData: Retrieving cached data...');
    const result = await getCachedJlptAnalytics();

    // Proactively push to Cloudflare
    if (result && !result.error) {
        try {
            await pushCloudflareSnapshot('jlpt', result);
        } catch (e) {
            console.error('Proactive JLPT snapshot push failed:', e);
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
