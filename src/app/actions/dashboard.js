'use server'

import { unstable_cache } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStudentSession } from './studentAuth'
import { getCloudflareSnapshot, pushCloudflareSnapshot } from './cloudflare'
import { normalizeClassName } from '@/lib/utils'

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

        // LAYER 3: Supabase Direct Query (Fallback)
        console.log(`Cache MISS (Cloudflare): Fetching from Supabase for ${cacheKey}...`);
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase configuration missing')
        }
        
        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)
        const normalizedClassName = normalizeClassName(className)
        const now = new Date()
        const nowIso = now.toISOString()

        // 1. Fetch Assignments (Active only, released)
        const { data: rawAssignments, error: assignmentsError } = await supabase
            .from('homework_assignments')
            .select('*')
            .ilike('class_name', normalizedClassName)
            .lte('released_at', nowIso)
            .or('is_archived.is.null,is_archived.is.false')
            .order('deadline', { ascending: true })

        if (assignmentsError) {
            console.error('Fetch assignments error:', assignmentsError)
            throw assignmentsError
        }

        // 2. Fetch Submissions for this student
        const { data: submissions, error: submissionsError } = await supabase
            .from('homework_submissions')
            .select('*')
            .eq('student_id_text', studentId)

        if (submissionsError) {
            console.error('Fetch submissions error:', submissionsError)
            throw submissionsError
        }

        // 3. Fetch Announcements
        const { data: announcements, error: announcementsError } = await supabase
            .from('announcements')
            .select(`
                id, title, content, is_pinned, created_at, sender_name,
                author:profiles!author_id (full_name)
            `)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(10)

        if (announcementsError) {
            console.error('Fetch announcements error:', announcementsError)
        }

        // Merge submissions into assignments
        const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || [])
        const assignmentsWithSubmissions = rawAssignments.map(a => ({
            ...a,
            submission: submissionMap.get(a.id) || null
        }))

        // Calculate Stats
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)

        const unsubmittedCount = assignmentsWithSubmissions.filter(a => !a.submission).length
        const completedCount = assignmentsWithSubmissions.filter(a => !!a.submission).length
        const submissionPoints = assignmentsWithSubmissions.reduce((sum, a) => sum + (a.submission?.score || 0), 0)
        const dueThisWeekCount = assignmentsWithSubmissions.filter(a => {
            if (!a.deadline) return false
            const deadline = new Date(a.deadline)
            return deadline >= now && deadline <= nextWeek
        }).length

        const result = {
            stats: {
                unsubmittedCount,
                completedCount,
                submissionPoints,
                dueThisWeekCount
            },
            recentAssignments: assignmentsWithSubmissions.slice(0, 10),
            announcements: announcements || []
        }

        // Update Cloudflare Snapshot for next time
        if (result) {
            await pushCloudflareSnapshot(cacheKey, result).catch(console.error);
        }

        return result
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
