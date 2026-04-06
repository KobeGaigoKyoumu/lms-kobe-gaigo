'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStudentSession } from './studentAuth'
import { getCloudflareSnapshot, pushCloudflareSnapshot } from './cloudflare'

/**
 * Fetches student dashboard data with Next.js Data Cache.
 * Includes stats, recent assignments, and announcements.
 */
export async function getStudentDashboardDataCached() {
    const session = await getStudentSession()
    if (!session) return null

    const fetcher = async (studentId, className, academicYear) => {
        const cacheKey = `dashboard-${studentId}`;
        
        // LAYER 2: Cloudflare Snapshot
        try {
            console.log(`Cache MISS (Next.js): Checking Cloudflare for ${cacheKey}...`);
            const snapshot = await getCloudflareSnapshot(cacheKey);
            if (snapshot) {
                console.log('Cache HIT (Cloudflare): Using snapshot.');
                return snapshot;
            }
        } catch (e) {
            console.error('Cloudflare fetch error:', e);
        }

        // LAYER 3: Supabase RPC (Final Fallback)
        console.log(`Cache MISS (Cloudflare): Fetching from Supabase for ${cacheKey}...`);
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_student_dashboard_data', {
            p_student_id: studentId,
            p_class_name: className,
            p_academic_year: academicYear
        })

        if (error) {
            console.error('RPC Error (get_student_dashboard_data):', error)
            throw error
        }

        // Update Cloudflare Snapshot for next time
        if (data) {
            await pushCloudflareSnapshot(cacheKey, data).catch(console.error);
        }

        return data
    }

    // Cache the result based on student identity and class
    const cachedData = await unstable_cache(
        async () => fetcher(session.studentId, session.className, session.academicYear),
        [`dashboard-${session.studentId}`],
        {
            tags: ['homework-assignments', 'announcements', 'student-stats'],
            revalidate: 3600 // Fallback revalidation (1 hour)
        }
    )()

    return {
        session,
        content: cachedData
    }
}
