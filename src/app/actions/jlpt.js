'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_cache as next_unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'
import { pushCloudflareSnapshot, getCloudflareSnapshot } from './cloudflare'
import { getEnhancedJlptStats } from '@/lib/jlpt'

/**
 * Internal core logic for JLPT Analytics.
 * This function bypasses cookie requirements by using the Service Role.
 */
async function getJlptAnalyticsDataInternal() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // LAYER 2: Try Cloudflare Snapshot before hitting Supabase
    try {
        console.log('Cache MISS (Next.js): Checking Cloudflare Snapshot...');
        const snapshot = await getCloudflareSnapshot('jlpt');
        if (snapshot && (snapshot.levelStats || snapshot.stats)) {
            console.log('Cache HIT (Cloudflare): Using snapshot.');
            return snapshot;
        }
    } catch (e) {
        console.error('Cloudflare fetch failed, falling back to DB:', e);
    }

    console.log('Cache MISS (Cloudflare): Fetching from Supabase...');
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
            .from('students')
            .select('*')

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

// Global variable to store memoized cache function
let _cachedJlptAnalyticsFunc = null;

function getCachedJlptAnalyticsInternal() {
    if (!_cachedJlptAnalyticsFunc) {
        _cachedJlptAnalyticsFunc = next_unstable_cache(
            getJlptAnalyticsDataInternal,
            ['jlpt-analytics-v3'],
            { tags: ['jlpt-analytics'], revalidate: 3600 }
        );
    }
    return _cachedJlptAnalyticsFunc();
}

/**
 * Public function for Server Components
 */
export async function getJlptAnalyticsData(session) {
    if (!session) return { error: 'Unauthorized' }

    console.log('getJlptAnalyticsData: Retrieving cached data...');
    const result = await getCachedJlptAnalyticsInternal();

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
