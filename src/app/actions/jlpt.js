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

        // Import additional functions from lib
        const { 
            getStudentsJlptSummary, 
            getJlptSectionScoreStats, 
            getJlptNationalStats 
        } = require('@/lib/jlpt');

        // Perform all calculations
        const [enhanced, sectionScores, nationalStats, studentSummaries] = await Promise.all([
            getEnhancedJlptStats(students || []),
            getJlptSectionScoreStats(),
            getJlptNationalStats(),
            getStudentsJlptSummary(students || [])
        ]);
        
        console.log('[JlptAnalytics] All stats calculated successfully')

        // Group students by class for studentStats
        const classStatsMap = new Map();
        studentSummaries.forEach(s => {
            const className = s.class || '不明';
            if (!classStatsMap.has(className)) {
                classStatsMap.set(className, {
                    className,
                    total: 0,
                    n3Plus: 0,
                    students: []
                });
            }
            const c = classStatsMap.get(className);
            c.total++;
            // Consider N1, N2, N3 as N3+
            const hasN3Plus = s.highestLevel && ['N1', 'N2', 'N3'].includes(s.highestLevel);
            if (hasN3Plus) {
                c.n3Plus++;
            }
            c.students.push(s);
        });

        // Convert map to array and calculate rates
        const studentStats = Array.from(classStatsMap.values()).map(c => ({
            ...c,
            n3PlusRate: c.total > 0 ? ((c.n3Plus / c.total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.n3PlusRate - a.n3PlusRate);

        // Combine everything into a single response object
        const result = {
            ...enhanced,
            studentStats,
            sectionScores,
            nationalStats,
            lastUpdated: new Date().toISOString()
        };

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
