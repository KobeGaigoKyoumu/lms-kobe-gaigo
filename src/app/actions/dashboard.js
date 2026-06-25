'use server'

import { unstable_cache as next_unstable_cache } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStudentSession } from './studentAuth'
import { getAdminMemberSession } from './adminAuth'
import { getCloudflareSnapshot, pushCloudflareSnapshot } from './cloudflare'
import { normalizeClassName } from '@/lib/utils'

/**
 * Fetches teacher dashboard data using Service Role Client to bypass RLS.
 * Includes assigned classes, pending submissions count, and recent assignments.
 */
export async function getTeacherDashboardData() {
    try {
        const adminMember = await getAdminMemberSession()
        if (!adminMember) return null

        const userId = adminMember.memberId
        const adminName = adminMember.name
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase config missing')
        
        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

        // 1. Fetch Teacher Classes
        const { data: teacherClasses } = await supabase
            .from('classes')
            .select('name, teacher_id, homeroom_teacher_name')
            .or(`teacher_id.eq.${userId || 0},homeroom_teacher_name.eq."${adminName || '不明'}"`)

        if (!teacherClasses || teacherClasses.length === 0) {
            return {
                teacherClasses: [],
                pendingAssignmentsCount: 0,
                recentAssignments: []
            }
        }

        const teacherClassNames = teacherClasses.map(c => c.name)

        // 2. Fetch Assignments
        const { data: allAssignments } = await supabase
            .from('homework_assignments')
            .select('id, title, deadline, class_name, released_at, is_archived, created_at')
            .in('class_name', teacherClassNames)
            .order('created_at', { ascending: false })
            .limit(100)

        const now = new Date()
        const activeAssignments = (allAssignments || []).filter(a => {
            const isNotArchived = !a.is_archived
            const releasedAtRaw = a.released_at || a.release_date || a.created_at
            const isReleased = !releasedAtRaw || new Date(releasedAtRaw) <= now
            return isNotArchived && isReleased
        })

        const activeAssignmentIds = activeAssignments.map(a => a.id)

        // 3. Fetch Pending Submissions Count
        let pendingCount = 0
        if (activeAssignmentIds.length > 0) {
            const { count } = await supabase
                .from('homework_submissions')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'submitted')
                .in('assignment_id', activeAssignmentIds)
            
            pendingCount = count || 0
        }

        return {
            teacherClasses,
            pendingAssignmentsCount: pendingCount,
            recentAssignments: activeAssignments.slice(0, 5)
        }
    } catch (e) {
        console.error('getTeacherDashboardData error:', e)
        return null
    }
}


/**
 * Fetches student dashboard data with Next.js Data Cache.
 * Includes stats, recent assignments, and announcements.
 */
export async function getStudentDashboardDataCached() {
    const session = await getStudentSession()
    if (!session) return null

    const fetcher = async (studentId, className, academicYear) => {
        const cacheKey = `dashboard-v2-${studentId}`;
        
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

        // 3. Fetch Announcements (Fetch all relevant metadata for filtering)
        const { data: rawAnnouncements, error: announcementsError } = await supabase
            .from('announcements')
            .select(`
                id, title, content, is_pinned, created_at, sender_name,
                target_type, target_class, target_grade, target_student_ids,
                author:profiles!author_id (full_name)
            `)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(50) // Higher limit for raw data

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
            rawAnnouncements: rawAnnouncements || [] // Store raw for later filtering
        }

        // Update Cloudflare Snapshot
        if (result) {
            await pushCloudflareSnapshot(cacheKey, result).catch(console.error);
        }

        return result
    }

    // Cache the result based on student identity and class
    const cachedData = await next_unstable_cache(
        async () => fetcher(session.studentId, session.className, session.academicYear),
        [`dashboard-v2-${session.studentId}`],
        {
            tags: ['homework-assignments', 'announcements', 'student-stats'],
            revalidate: 3600
        }
    )()

    // --- ROBUST FILTERING (Always runs, even on cache hit) ---
    const nowObj = new Date();
    const currentYear = nowObj.getFullYear();
    const isBeforeApril = nowObj.getMonth() < 3;
    const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear;
    const studentGrade = (academicYearBase - session.academicYear + 1).toString();
    const normStudentClass = normalizeClassName(session.className);

    const filteredAnnouncements = (cachedData?.rawAnnouncements || []).filter(a => {
        const type = (a.target_type || 'all').toLowerCase();
        
        if (type === 'all' || type === '全体' || !a.target_type) return true;

        if (type === 'grade' || type === '学年') {
            return String(a.target_grade) === studentGrade;
        }

        if (type === 'class' || type === 'クラス') {
            const normTargetClass = normalizeClassName(a.target_class || '');
            return normTargetClass === normStudentClass;
        }

        if ((type === 'individual' || type === '個人') && Array.isArray(a.target_student_ids)) {
            return a.target_student_ids.includes(session.studentId);
        }

        return false;
    }).slice(0, 10);

    return {
        session,
        content: {
            ...cachedData,
            announcements: filteredAnnouncements
        }
    }
}

/**
 * 教職員ダッシュボード用データをキャッシュ付きで一括取得する
 */
export async function getAdminDashboardDataCached() {
    const adminMember = await getAdminMemberSession()
    if (!adminMember) return null

    const fetcher = async (memberId, adminName) => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase configuration missing')
        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)
        const jstToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
        const yyyy = jstToday.getFullYear()
        const mm = String(jstToday.getMonth() + 1).padStart(2, '0')
        const dd = String(jstToday.getDate()).padStart(2, '0')
        const todayStr = `${yyyy}-${mm}-${dd}`
        const now = new Date().toISOString()

        // 1. Fetch Teacher Classes
        const { data: teacherClasses } = await supabase
            .from('classes')
            .select('name, teacher_id, homeroom_teacher_name')
            .or(`teacher_id.eq.${memberId},homeroom_teacher_name.eq."${adminName}"`)

        const teacherClassNames = (teacherClasses || []).map(c => normalizeClassName(c.name))
        const enrolledClassesCount = teacherClassNames.length

        // 2. Parallel Fetch: Announcements, Pending Count, Recent Assignments
        const [annResult, pendingResult, assignmentsResult] = await Promise.all([
            // Upcoming schedules from kanban_cards
            supabase
                .from('kanban_cards')
                .select(`
                    id, title, date, user_id,
                    admin_members:user_id(name)
                `)
                .not('date', 'is', null)
                .gte('date', todayStr)
                .order('date', { ascending: true })
                .limit(10),
            
            // Pending Submission Count
            enrolledClassesCount > 0 ? supabase
                .from('homework_submissions')
                .select('id, assignment:homework_assignments!inner(class_name, released_at, is_archived)', { count: 'exact', head: true })
                .eq('status', 'submitted')
                .in('assignment.class_name', teacherClassNames)
                .or(`is_archived.is.null,is_archived.is.false`, { foreignTable: 'homework_assignments' })
                : { count: 0 },

            // Recent Assignments
            enrolledClassesCount > 0 ? supabase
                .from('homework_assignments')
                .select('id, title, deadline, class_name, released_at, is_archived')
                .in('class_name', teacherClassNames)
                .or('is_archived.is.null,is_archived.is.false')
                .or(`released_at.is.null,released_at.lte."${now}"`)
                .order('created_at', { ascending: false })
                .limit(5) : { data: [] }
        ])

        return {
            upcomingPlans: annResult.data || [],
            stats: {
                enrolledClasses: (teacherClasses || []).map(c => c.name),
                enrolledClassesCount,
                pendingAssignmentsCount: pendingResult.count || 0,
                recentAssignments: assignmentsResult.data || []
            }
        }
    }

    // Cache based on administrative member ID
    const cachedData = await next_unstable_cache(
        async () => fetcher(adminMember.memberId, adminMember.name),
        [`admin-dashboard-${adminMember.memberId}`],
        {
            tags: ['homework-assignments', 'announcements', 'classes', 'homework-submissions', 'kanban'],
            revalidate: 3600
        }
    )()

    return {
        adminMember,
        content: cachedData
    }
}
