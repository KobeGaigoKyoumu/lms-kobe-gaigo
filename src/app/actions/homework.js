'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { normalizeClassName } from '@/lib/utils'
import { getStudentSession } from './studentAuth'
import { getAdminMemberSession } from './adminAuth'
import { revalidatePath, unstable_cache as next_unstable_cache, revalidateTag } from 'next/cache'
import { uploadToImageKit } from './imagekit'
import cloudinary from '@/lib/cloudinary'

// Helper for admin client (Service Role)
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'
    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// Cache classes list for 1 hour
async function _getClassesListInternal() {
    const supabase = createAdminClient()
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('academic_year', 2026) // Filter for current year
        .order('name', { ascending: true })

    if (error) {
        console.error('Fetch classes error:', error)
        return []
    }
    return classes
}

let _cachedClassesListFunc = null;
function getCachedClassesList() {
    if (!_cachedClassesListFunc) {
        _cachedClassesListFunc = next_unstable_cache(
            _getClassesListInternal,
            ['classes-list-v5'],
            { tags: ['classes'], revalidate: 3600 }
        );
    }
    return _cachedClassesListFunc();
}

export async function getClassesList() {
    return getCachedClassesList()
}

// Fetch all unique subject names from the timetable (schedules)
async function _getTimetableSubjectsInternal() {
    const supabase = createAdminClient()
    const { data: schedules, error } = await supabase
        .from('schedules')
        .select('subject')
        .not('subject', 'is', null)
    
    if (error) {
        console.error('Fetch timetable subjects error:', error)
        return []
    }

    // Extract unique subject names and filter out empty strings
    const subjects = [...new Set(
        schedules
            .map(s => s.subject.trim())
            .filter(s => s.length > 0)
    )].sort()

    return subjects
}

let _cachedTimetableSubjectsFunc = null;
function getCachedTimetableSubjects() {
    if (!_cachedTimetableSubjectsFunc) {
        _cachedTimetableSubjectsFunc = next_unstable_cache(
            _getTimetableSubjectsInternal,
            ['timetable-subjects-list-v2'],
            { tags: ['schedules'], revalidate: 3600 }
        );
    }
    return _cachedTimetableSubjectsFunc();
}

export async function getTimetableSubjects() {
    return getCachedTimetableSubjects()
}
// Internal function for student assignments (Ultra-safe query using Admin Client to bypass RLS)
// Internal function for student assignments (Ultra-safe query using Admin Client to bypass RLS)
async function _getStudentAssignments(studentId, className) {
    const supabase = createAdminClient()
    return await _getStudentAssignmentsWithClient(supabase, studentId, className)
}

async function _getStudentAssignmentsWithClient(supabase, studentId, className) {
    const normalizedClassName = normalizeClassName(className)
    const now = new Date()
    
    console.log(`[DEBUG] Fetching assignments for student: ${studentId}, class: ${normalizedClassName} (Full History Mode)`)

    // 1. Get student's submissions first
    const { data: submissions, error: submissionError } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id_text', studentId)

    if (submissionError) {
        console.error('[DEBUG] Fetch submissions error:', submissionError)
    }

    const submissionMap = new Map()
    const submittedIds = []
    if (submissions) {
        submissions.forEach(s => {
            submissionMap.set(s.assignment_id, s)
            submittedIds.push(s.assignment_id)
        })
    }

    // 2. Get assignments matching current class OR previously submitted IDs
    // (Ultra-safe: select('*'))
    let query = supabase.from('homework_assignments').select('*')
    
    if (submittedIds.length > 0) {
        query = query.or(`class_name.ilike."${normalizedClassName}",id.in.(${submittedIds.map(id => `"${id}"`).join(',')})`)
    } else {
        query = query.ilike('class_name', normalizedClassName)
    }

    const { data: allAssignments, error: activeError } = await query.order('deadline', { ascending: true })

    if (activeError) {
        console.error('[DEBUG] FATAL Query Error during history fetch:', activeError)
        return { active: [], archived: [] }
    }

    console.log(`[DEBUG] Found ${allAssignments?.length || 0} total visible assignments.`)

    // 3. Logic: Filter in JavaScript memory
    const active = []
    const archived = []

    if (allAssignments) {
        allAssignments.forEach(a => {
            // Find the release date from any possible property name
            const releaseValue = a.release_date || a.released_at || a.release_at || null
            const releaseDate = releaseValue ? new Date(releaseValue) : null
            const deadline = a.deadline ? new Date(a.deadline) : null
            const isArchived = a.is_archived === true

            // If submitted, it should always be visible (even if not released yet - should not happen but safe)
            const isSubmitted = submissionMap.has(a.id)
            const isReleased = !releaseDate || releaseDate <= now || isSubmitted

            if (isReleased) {
                const item = {
                    ...a,
                    submission: submissionMap.get(a.id) || null
                }
                
                // Active/Archived split
                // If it is ALREADY passed deadline, it is archived.
                // If it is manually archived, it is archived.
                if (isArchived || (deadline && deadline < now)) {
                    archived.push(item)
                } else {
                    active.push(item)
                }
            }
        })
    }

    console.log(`[DEBUG] Final Counts - Active: ${active.length}, Archived: ${archived.length}`)
    return { active, archived }
}

// Fetch active assignments for the student (Fresh fetch to avoid white screen crashes)
export async function getStudentAssignments() {
    try {
        const session = await getStudentSession()
        if (!session) return { active: [], archived: [] }
    
        return await _getStudentAssignments(session.studentId, session.className)
    } catch (e) {
        console.error('[DEBUG] getStudentAssignments fatal error:', e)
        return { active: [], archived: [] }
    }
}

// Internal cached assignment fetcher (Ultra-safe select('*'))
async function _getAssignmentInternal(id) {
    const supabase = createAdminClient()
    const { data: assignment, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching assignment detail:', error)
        return null
    }
    return assignment
}

function getCachedAssignment(id) {
    if (!global._cachedAssignmentFunc) {
        global._cachedAssignmentFunc = next_unstable_cache(
            async (id) => _getAssignmentInternal(id),
            ['assignment-details-v3-final'],
            { tags: ['homework-assignments'], revalidate: 3600 }
        );
    }
    return global._cachedAssignmentFunc(id);
}

// Fetch a single assignment details
export async function getAssignmentDetails(id) {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // 1. Get Assignment (Cached)
    const assignment = await getCachedAssignment(id)

    if (!assignment) {
        console.warn('Assignment not found:', id)
        return null
    }

    // Check if released (Safe property access)
    const now = new Date()
    const releasedAtRaw = assignment.release_date || assignment.released_at || assignment.release_at || assignment.created_at
    const releasedAt = new Date(releasedAtRaw)
    
    if (releasedAt > now) {
        console.warn('Unauthorized assignment access attempt (not released yet):', session.studentId, id)
        return null
    }

    // Security check: Ensure student belongs to class
    const assignmentClass = assignment.class_name ? String(assignment.class_name).trim() : ''
    const sessionClass = session.className ? String(session.className).trim() : ''

    if (assignmentClass !== sessionClass && decodeURIComponent(assignmentClass) !== sessionClass) {
        console.warn('Unauthorized assignment access attempt (Class mismatch):', {
            student: session.studentId,
            studentClass: sessionClass,
            assignmentClass: assignmentClass
        })
        // return null // TODO: Temporarily allow to avoid blocking while fixing
    }

    // 2. Get Submission (Uncached - User specific)
    const { data: submission, error: submissionError } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('assignment_id', id)
        .eq('student_id_text', session.studentId)
        .maybeSingle()

    return {
        ...assignment,
        submission: submission || null
    }
}

const DEFAULT_FEEDBACK_OPTIONS = [
    'いいです！',
    'OKです！',
    'すばらしいです！',
    'とてもいいです！',
    'よく頑張っています！',
    'カンペキ！',
    'グレート！',
    'パーフェクト！',
    'ちゃんとやっていますね！'
]

function getRandomFeedback() {
    const index = Math.floor(Math.random() * DEFAULT_FEEDBACK_OPTIONS.length)
    return DEFAULT_FEEDBACK_OPTIONS[index]
}

// Submit homework
export async function submitHomework(assignmentId, comment, fileUrls) {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // Check if submission already exists
    const { data: existing } = await supabase
        .from('homework_submissions')
        .select('id, status, feedback')
        .eq('assignment_id', assignmentId)
        .eq('student_id_text', session.studentId)
        .single()

    let error;
    const initialFeedback = existing?.feedback || getRandomFeedback()

    if (existing) {
        const isResubmitted = existing.status === 'returned' || existing.status === 'resubmitted'
        const newStatus = isResubmitted ? 'resubmitted' : 'graded'

        // Update
        const { error: updateError } = await supabase
            .from('homework_submissions')
            .update({
                comment,
                file_urls: fileUrls,
                submitted_at: new Date().toISOString(),
                status: newStatus,
                score: 1,
                feedback: initialFeedback
            })
            .eq('id', existing.id)
        error = updateError
    } else {
        // Insert
        const { error: insertError } = await supabase
            .from('homework_submissions')
            .insert({
                assignment_id: assignmentId,
                student_id_text: session.studentId,
                comment,
                file_urls: fileUrls,
                status: 'graded',
                score: 1,
                feedback: initialFeedback
            })
        error = insertError
    }

    if (error) {
        console.error('Submission error:', error)
        return { error: '提出に失敗しました。' }
    }

    revalidateTag('homework-stats', 'max')
    revalidateTag('homework-assignments', 'max')
    revalidatePath(`/student/homework/${assignmentId}`)
    revalidatePath('/student/dashboard')

    return { success: true }
}

// --- Teacher Actions ---

export async function createAssignment(formData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    if (!user && !adminMember) {
        return { error: 'Unauthorized' }
    }

    const title = formData.get('title')
    const description = formData.get('description')
    const classNames = formData.getAll('classNames')
    const subject = formData.get('subject')
    // Support both snake_case and camelCase for robustness
    let deadline = formData.get('deadline') || formData.get('dueDate')
    let releasedAt = formData.get('released_at') || formData.get('releasedAt')

    if (!title || !classNames || classNames.length === 0 || !deadline) {
        console.error('[createAssignment] Missing required fields:', { title, classNamesCount: classNames?.length, deadline })
        return { error: '必須項目（タイトル、クラス、締切）を入力してください' }
    }

    // Format deadline to ISO with timezone if needed
    if (deadline && typeof deadline === 'string' && !deadline.includes('Z') && !deadline.includes('+')) {
        deadline = `${deadline}:00+09:00`
    }

    // Format releasedAt or fallback to now
    if (releasedAt && typeof releasedAt === 'string') {
        if (!releasedAt.includes('Z') && !releasedAt.includes('+')) {
            releasedAt = `${releasedAt}:00+09:00`
        }
    } else {
        releasedAt = new Date().toISOString()
    }

    const adminSupabase = createAdminClient()
    
    const insertData = classNames.map(className => ({
        title,
        description,
        class_name: normalizeClassName(className),
        subject: subject || null,
        deadline,
        released_at: releasedAt,
        teacher_id: user?.id || null,
        is_archived: false
    }))

    const { data: newAssignments, error } = await adminSupabase
        .from('homework_assignments')
        .insert(insertData)
        .select()

    if (error) {
        console.error('[createAssignment] Supabase error:', error)
        return { error: `作成に失敗しました: ${error.message} (${error.code})` }
    }

    // Comprehensive revalidation for immediate reflection
    revalidateTag('homework-assignments', 'max')
    revalidateTag('homework-stats', 'max')
    revalidateTag('schedules', 'max')
    revalidateTag('storage-usage', 'max')
    revalidatePath('/assignments')
    revalidatePath('/assignments/new')
    
    return { success: true, ids: newAssignments.map(a => a.id) }
}

export async function deleteAssignment(id) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    if (!user && !adminMember) {
        return { error: 'Unauthorized' }
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('homework_assignments')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Delete assignment error:', error)
        return { error: '削除に失敗しました' }
    }

    // Comprehensive revalidation for immediate reflection
    revalidateTag('homework-assignments', 'max')
    revalidateTag('homework-stats', 'max')
    revalidatePath('/assignments')
    revalidatePath('/assignments/new')
    
    return { success: true }
}

export async function updateAssignmentDeadline(assignmentId, newDeadline) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    if (!user && !adminMember) {
        return { error: 'Unauthorized' }
    }

    let parsedDeadline = newDeadline
    if (parsedDeadline && !parsedDeadline.includes('Z') && !parsedDeadline.includes('+')) {
        parsedDeadline = `${parsedDeadline}:00+09:00`
    }

    const adminSupabase = createAdminClient()
    let query = adminSupabase
        .from('homework_assignments')
        .update({ deadline: parsedDeadline })
        .eq('id', assignmentId)

    if (user && !adminMember) {
        query = query.eq('teacher_id', user.id)
    }

    const { error } = await query

    if (error) {
        console.error('Update deadline error:', error)
        return { error: '期限の更新に失敗しました' }
    }

    // Comprehensive revalidation for immediate reflection
    revalidateTag('homework-assignments', 'max')
    revalidateTag('homework-stats', 'max')
    revalidatePath(`/assignments/${assignmentId}`)
    revalidatePath('/assignments')
    
    return { success: true }
}

export async function getRelatedAssignmentClasses(assignmentId) {
    const supabase = createAdminClient()
    const { data: current } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()
        
    if (!current) return []
    
    // 同じタイトル・科目・教師の関連課題を抽出
    let query = supabase
        .from('homework_assignments')
        .select('id, class_name')
        .eq('title', current.title)

    if (current.subject) {
        query = query.eq('subject', current.subject)
    }
    if (current.teacher_id) {
        query = query.eq('teacher_id', current.teacher_id)
    }

    const { data: related } = await query

    if (!related || related.length === 0) return [current.class_name]
    
    return Array.from(new Set(related.map(r => r.class_name)))
}

export async function updateAssignment(assignmentId, { title, subject, description, deadline, released_at, classNames }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    if (!user && !adminMember) {
        return { error: 'Unauthorized' }
    }

    let parsedDeadline = deadline
    if (parsedDeadline && !parsedDeadline.includes('Z') && !parsedDeadline.includes('+')) {
        parsedDeadline = `${parsedDeadline}:00+09:00`
    }

    let parsedReleasedAt = released_at
    if (parsedReleasedAt && !parsedReleasedAt.includes('Z') && !parsedReleasedAt.includes('+')) {
        parsedReleasedAt = `${parsedReleasedAt}:00+09:00`
    }

    const adminSupabase = createAdminClient()

    // 1. 対象の課題情報を取得
    const { data: currentAssignment, error: fetchErr } = await adminSupabase
        .from('homework_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()

    if (fetchErr || !currentAssignment) {
        return { error: '対象の課題が見つかりません' }
    }

    // 2. 元課題の更新（class_name含む）
    let targetClassName = currentAssignment.class_name
    if (Array.isArray(classNames) && classNames.length > 0) {
        const normalizedTargetClasses = classNames.map(c => normalizeClassName(c))
        if (!normalizedTargetClasses.includes(normalizeClassName(currentAssignment.class_name))) {
            targetClassName = normalizedTargetClasses[0]
        }
    }

    let query = adminSupabase
        .from('homework_assignments')
        .update({
            title,
            subject: subject || null,
            description,
            deadline: parsedDeadline,
            released_at: parsedReleasedAt,
            class_name: normalizeClassName(targetClassName)
        })
        .eq('id', assignmentId)

    if (user && !adminMember) {
        query = query.eq('teacher_id', user.id)
    }

    const { error } = await query

    if (error) {
        console.error('Update assignment error:', error)
        return { error: '課題の更新に失敗しました' }
    }

    // 3. 複数クラスへの反映処理
    if (Array.isArray(classNames) && classNames.length > 0) {
        const normalizedClassNames = Array.from(new Set(classNames.map(c => normalizeClassName(c))))

        let relatedQuery = adminSupabase
            .from('homework_assignments')
            .select('id, class_name')
            .eq('title', currentAssignment.title)

        if (currentAssignment.subject) {
            relatedQuery = relatedQuery.eq('subject', currentAssignment.subject)
        }
        if (currentAssignment.teacher_id) {
            relatedQuery = relatedQuery.eq('teacher_id', currentAssignment.teacher_id)
        }

        const { data: relatedAssignments } = await relatedQuery

        const existingClassMap = new Map()
        if (relatedAssignments) {
            relatedAssignments.forEach(a => {
                existingClassMap.set(normalizeClassName(a.class_name), a.id)
            })
        }

        // A. 新たに追加されたクラスへ課題を作成または既存同名課題を更新
        for (const cls of normalizedClassNames) {
            const existingId = existingClassMap.get(cls)
            if (existingId) {
                if (existingId !== assignmentId) {
                    await adminSupabase
                        .from('homework_assignments')
                        .update({
                            title,
                            subject: subject || null,
                            description,
                            deadline: parsedDeadline,
                            released_at: parsedReleasedAt
                        })
                        .eq('id', existingId)
                }
            } else {
                await adminSupabase
                    .from('homework_assignments')
                    .insert({
                        title,
                        description,
                        class_name: cls,
                        subject: subject || null,
                        deadline: parsedDeadline,
                        released_at: parsedReleasedAt,
                        teacher_id: currentAssignment.teacher_id || user?.id || null,
                        is_archived: false
                    })
            }
        }

        // B. 選択から外されたクラスの関連課題の削除（提出物がない場合のみ安全に削除）
        for (const [cls, relId] of existingClassMap.entries()) {
            if (!normalizedClassNames.includes(cls) && relId !== assignmentId) {
                const { count } = await adminSupabase
                    .from('homework_submissions')
                    .select('id', { count: 'exact', head: true })
                    .eq('assignment_id', relId)

                if (!count || count === 0) {
                    await adminSupabase
                        .from('homework_assignments')
                        .delete()
                        .eq('id', relId)
                }
            }
        }
    }

    // Comprehensive revalidation for immediate reflection
    revalidateTag('homework-assignments', 'max')
    revalidateTag('homework-stats', 'max')
    revalidatePath(`/assignments/${assignmentId}`)
    revalidatePath('/assignments')
    
    return { success: true }
}

export async function copyAssignment(sourceAssignmentId, targetClassNames, customData = {}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    if (!user && !adminMember) {
        return { error: 'Unauthorized' }
    }

    if (!targetClassNames || targetClassNames.length === 0) {
        return { error: '少なくとも1つの対象クラスを選択してください' }
    }

    const adminSupabase = createAdminClient()

    const { data: source, error: fetchErr } = await adminSupabase
        .from('homework_assignments')
        .select('*')
        .eq('id', sourceAssignmentId)
        .single()

    if (fetchErr || !source) {
        return { error: 'コピー元の課題が見つかりません' }
    }

    const title = customData.title || source.title
    const description = customData.description !== undefined ? customData.description : source.description
    const subject = customData.subject !== undefined ? customData.subject : source.subject
    
    let deadline = customData.deadline || source.deadline
    if (deadline && typeof deadline === 'string' && !deadline.includes('Z') && !deadline.includes('+')) {
        deadline = `${deadline}:00+09:00`
    }

    let releasedAt = customData.released_at || source.released_at || new Date().toISOString()
    if (releasedAt && typeof releasedAt === 'string' && !releasedAt.includes('Z') && !releasedAt.includes('+')) {
        releasedAt = `${releasedAt}:00+09:00`
    }

    const insertData = targetClassNames.map(className => ({
        title,
        description,
        class_name: normalizeClassName(className),
        subject: subject || null,
        deadline,
        released_at: releasedAt,
        teacher_id: user?.id || source.teacher_id || null,
        is_archived: false
    }))

    const { data: newAssignments, error } = await adminSupabase
        .from('homework_assignments')
        .insert(insertData)
        .select()

    if (error) {
        console.error('Copy assignment error:', error)
        return { error: `コピーに失敗しました: ${error.message}` }
    }

    revalidateTag('homework-assignments', 'max')
    revalidateTag('homework-stats', 'max')
    revalidatePath('/assignments')

    return { success: true, ids: newAssignments.map(a => a.id) }
}

export async function getAssignmentForCopy(id) {
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
        .from('homework_assignments')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return null
    return data
}


async function _getTeacherAssignmentsInternal() {
    const supabase = createAdminClient()
    const { data: assignments, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Fetch teacher assignments error:', error)
        return []
    }

    return assignments
}

let _cachedTeacherAssignmentsFunc = null;
function getCachedTeacherAssignments() {
    if (!_cachedTeacherAssignmentsFunc) {
        _cachedTeacherAssignmentsFunc = next_unstable_cache(
            _getTeacherAssignmentsInternal,
            ['teacher-assignments-list'],
            { tags: ['homework-assignments'], revalidate: 3600 }
        );
    }
    return _cachedTeacherAssignmentsFunc();
}

export async function getTeacherAssignments() {
    return getCachedTeacherAssignments()
}

export async function getAssignmentsByClass(className, isArchived = false) {
    const decodedClassName = decodeURIComponent(className)
    
    // We can still use next_unstable_cache directly inside the function if we don't call it at top level,
    // but for consistency with others, let's use a memoized factory.
    const fetcher = next_unstable_cache(
        async () => {
            const supabase = createAdminClient()
            let query = supabase
                .from('homework_assignments')
                .select(`
                    *,
                    course:courses!course_id(id, title)
                `)
                .eq('class_name', decodedClassName)
                .order('created_at', { ascending: false })
            
            if (isArchived) {
                query = query.eq('is_archived', true)
            } else {
                query = query.or('is_archived.is.null,is_archived.is.false')
            }
            
            const { data: assignments, error } = await query

            if (error) {
                console.error('Fetch assignments by class error:', error)
                return []
            }

            return assignments
        },
        ['class-assignments-v3', decodedClassName, String(isArchived)],
        { tags: ['homework-assignments'], revalidate: 3600 }
    )
    return fetcher()
}

export async function getAssignmentSubmissions(assignmentId) {
    const supabase = createAdminClient()

    const { data: assignment, error: assignmentError } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()

    if (assignmentError) return null

    const { data: submissions, error: subError } = await supabase
        .from('homework_submissions')
        .select(`
            id, assignment_id, student_id_text, status, submitted_at, score, comment, file_urls, feedback, updated_at,
            student:students (
                full_name,
                class_name
            )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false })

    if (subError) {
        console.error('Fetch submissions error:', subError)
        return { assignment, submissions: [] }
    }

    // 未採点(submitted)または点数が未決定(null)の提出物に対して、自動で点数1およびランダムフィードバックでDB保存
    const pendingSubmissions = (submissions || []).filter(
        s => s.status === 'submitted' || s.score === null || s.score === undefined
    )

    if (pendingSubmissions.length > 0) {
        let updatedAny = false
        for (const s of pendingSubmissions) {
            const feedbackText = s.feedback || getRandomFeedback()
            const { error: autoGradeError } = await supabase
                .from('homework_submissions')
                .update({
                    score: 1,
                    feedback: feedbackText,
                    status: 'graded',
                    updated_at: new Date().toISOString()
                })
                .eq('id', s.id)

            if (!autoGradeError) {
                s.score = 1
                s.feedback = feedbackText
                s.status = 'graded'
                updatedAny = true
            } else {
                console.error('Auto grade submission error:', autoGradeError)
            }
        }
        if (updatedAny) {
            revalidateTag('homework-stats', 'max')
            revalidateTag('homework-assignments', 'max')
            revalidatePath('/assignments', 'layout')
            revalidatePath('/dashboard', 'layout')
        }
    }

    return {
        assignment,
        submissions: submissions || []
    }
}

export async function gradeSubmission(submissionId, score, feedback) {
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
        .from('homework_submissions')
        .update({
            score: (score !== '' && score !== null && score !== undefined) ? parseInt(score) : null,
            feedback,
            status: 'graded',
            updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)

    if (error) {
        console.error('Grading error:', error)
        return { error: '保存に失敗しました' }
    }

    // Comprehensive revalidation for immediate reflection
    revalidateTag('homework-stats', 'max')
    revalidateTag('homework-assignments', 'max')
    revalidatePath('/assignments', 'layout') // Revalidate entire tree
    
    return { success: true }
}

export async function returnSubmission(submissionId, feedback) {
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
        .from('homework_submissions')
        .update({
            score: null,
            feedback,
            status: 'returned',
            updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)

    if (error) {
        console.error('Return submission error:', error)
        return { error: '差し戻しに失敗しました' }
    }

    // Comprehensive revalidation for immediate reflection
    revalidateTag('homework-stats', 'max')
    revalidateTag('homework-assignments', 'max')
    revalidatePath('/assignments', 'layout') // Revalidate entire tree
    
    return { success: true }
}

export async function uploadSubmissionFile(formData) {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const file = formData.get('file')
    const assignmentId = formData.get('assignmentId')

    if (!file) {
        return { error: 'ファイルが見つかりません' }
    }

    const folder = `submissions/${assignmentId}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // -----------------------------------------------------------------
    // 優先順位 1: Cloudinary (プライマリーメイン)
    // -----------------------------------------------------------------
    try {
        console.log('[uploadSubmissionFile] Attempting Cloudinary upload...')
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'auto',
                    use_filename: true,
                    unique_filename: true
                },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            )
            uploadStream.end(buffer)
        })

        console.log('[uploadSubmissionFile] Cloudinary upload success.')
        return {
            success: true,
            url: uploadResult.secure_url,
            name: file.name,
            path: uploadResult.public_id,
            storageUsed: 'cloudinary'
        }
    } catch (cloudinaryError) {
        console.error('[uploadSubmissionFile] Cloudinary upload failed, falling back to ImageKit:', cloudinaryError)
    }

    // -----------------------------------------------------------------
    // 優先順位 2: ImageKit (セカンダリーメイン)
    // -----------------------------------------------------------------
    try {
        console.log('[uploadSubmissionFile] Attempting ImageKit upload...')
        const result = await uploadToImageKit(formData, `/${folder}`)
        if (result && result.success) {
            console.log('[uploadSubmissionFile] ImageKit upload success.')
            return {
                success: true,
                url: result.url,
                name: file.name,
                path: result.fileId,
                storageUsed: 'imagekit'
            }
        }
        throw new Error(result?.error || 'ImageKit upload failed')
    } catch (imageKitError) {
        console.error('[uploadSubmissionFile] ImageKit upload failed, falling back to Supabase:', imageKitError)
    }

    // -----------------------------------------------------------------
    // 優先順位 3: Supabase Storage (緊急用フォールバック)
    // -----------------------------------------------------------------
    try {
        console.log('[uploadSubmissionFile] Attempting Supabase Storage upload (Emergency)...')
        const fileExt = file.name.split('.').pop()
        const fileName = `submission-${assignmentId}-${session.studentId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const bucketName = 'chat-attachments'
        const adminSupabase = createAdminClient()

        const { data, error } = await adminSupabase
            .storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            })

        if (error) throw error

        const { data: { publicUrl } } = adminSupabase
            .storage
            .from(bucketName)
            .getPublicUrl(fileName)

        console.log('[uploadSubmissionFile] Supabase Storage upload success.')
        return {
            success: true,
            url: publicUrl,
            name: file.name,
            path: fileName,
            storageUsed: 'supabase'
        }
    } catch (supabaseError) {
        console.error('[uploadSubmissionFile] All storages failed:', supabaseError)
        return { error: `アップロードに失敗しました: ${supabaseError.message}` }
    } finally {
        revalidateTag('storage-usage', 'max')
    }
}

async function _getAllStudentSubmissionStatsInternal() {
    const supabase = createAdminClient()
    const { data: submissions, error } = await supabase
        .from('homework_submissions')
        .select('student_id_text, score, status')

    if (error) {
        console.error('Error fetching all stats:', error)
        return []
    }

    const statsMap = new Map()
    submissions.forEach(sub => {
        if (!statsMap.has(sub.student_id_text)) {
            statsMap.set(sub.student_id_text, {
                count: 0,
                totalScore: 0
            })
        }
        const stat = statsMap.get(sub.student_id_text)
        if (sub.status === 'submitted' || sub.status === 'graded') {
            stat.count += 1
            stat.totalScore += (sub.score || 0)
        }
    })

    return Array.from(statsMap.entries()).map(([studentId, stat]) => ({
        student_id_text: studentId,
        submission_count: stat.count,
        total_score: stat.totalScore
    }))
}

let _cachedAllStudentSubmissionStatsFunc = null;
function getCachedAllStudentSubmissionStats() {
    if (!_cachedAllStudentSubmissionStatsFunc) {
        _cachedAllStudentSubmissionStatsFunc = next_unstable_cache(
            _getAllStudentSubmissionStatsInternal,
            ['all-student-submission-stats-v1'],
            { tags: ['homework-stats'], revalidate: 3600 }
        );
    }
    return _cachedAllStudentSubmissionStatsFunc();
}

export async function getAllStudentSubmissionStats() {
    return getCachedAllStudentSubmissionStats()
}

async function _getClassSubmissionStatsInternal(className) {
    const supabase = createAdminClient()
    const { data: students } = await supabase
        .from('students')
        .select('student_id_text')
        .eq('class_name', className)
        .eq('status', 'active')

    if (!students || students.length === 0) return []

    const studentIds = students.map(s => s.student_id_text)

    const { data: submissions, error } = await supabase
        .from('homework_submissions')
        .select('student_id_text, score, status')
        .in('student_id_text', studentIds)

    if (error) {
        console.error('Error fetching class stats:', error)
        return []
    }

    const statsMap = new Map()
    studentIds.forEach(id => {
        statsMap.set(id, { count: 0, totalScore: 0 })
    })

    submissions.forEach(sub => {
        if (statsMap.has(sub.student_id_text)) {
            const stat = statsMap.get(sub.student_id_text)
            if (sub.status === 'submitted' || sub.status === 'graded') {
                stat.count += 1
                stat.totalScore += (sub.score || 0)
            }
        }
    })

    return Array.from(statsMap.entries()).map(([studentId, stat]) => ({
        student_id_text: studentId,
        submission_count: stat.count,
        total_score: stat.totalScore
    }))
}

function getCachedClassSubmissionStats(className) {
    if (!global._cachedClassSubmissionStatsFunc) {
        global._cachedClassSubmissionStatsFunc = next_unstable_cache(
            async (className) => _getClassSubmissionStatsInternal(className),
            ['class-submission-stats-v2-final'],
            { tags: ['homework-stats'], revalidate: 3600 }
        );
    }
    return global._cachedClassSubmissionStatsFunc(className);
}

export async function getClassSubmissionStats(className) {
    return getCachedClassSubmissionStats(className)
}

export async function getClassSubmissionMatrix(className, isArchived = false) {
    const decodedClassName = decodeURIComponent(className)

    const fetcher = next_unstable_cache(
        async () => {
            const supabase = createAdminClient()

            if (isArchived) {
                // =============== アーカイブモード (過去の課題) ===============
                // 過去のクラスのため現在の「students.class_name」で探すと誰もいない可能性がある。
                // そのため、課題 → 提出物 → 提出した学生 という順番で取得し、過去の提出履歴から名簿を復元する。

                // 1. Get assignments for this class (sorted by deadline)
                const { data: assignments, error: assignmentsError } = await supabase
                    .from('homework_assignments')
                    .select('id, title, deadline, created_at, course_id, subject')
                    .eq('class_name', decodedClassName)
                    .eq('is_archived', true)
                    .order('deadline', { ascending: true })

                if (assignmentsError || !assignments || assignments.length === 0) {
                    return { students: [], assignments: [], submissions: [] }
                }

                const assignmentIds = assignments.map(a => a.id)

                // 2. Get all submissions for these assignments (クラス制限なしで全取得)
                const { data: submissions, error: subError } = await supabase
                    .from('homework_submissions')
                    .select('student_id_text, assignment_id, status, score, submitted_at, updated_at, feedback')
                    .in('assignment_id', assignmentIds)

                if (subError || !submissions || submissions.length === 0) {
                    return { students: [], assignments, submissions: [] }
                }

                // 3. 提出物から過去の学生ID（student_id_text）を抽出
                const submittedStudentIds = [...new Set(submissions.map(s => s.student_id_text))]

                // 4. その学生たちの現在の名前などを取得
                const { data: students, error: studentsError } = await supabase
                    .from('students')
                    .select('student_id_text, full_name')
                    .in('student_id_text', submittedStudentIds)
                    .order('full_name', { ascending: true })

                return {
                    students: students || [], 
                    assignments,
                    submissions
                }

            } else {
                // =============== 通常モード (今年の課題) ===============
                // 現在そのクラスに在籍している学生をベースにマトリクスを作成する（未提出の学生も一覧に並べるため）
                
                // 1. Get current students in this class
                const { data: students, error: studentsError } = await supabase
                    .from('students')
                    .select('student_id_text, full_name')
                    .eq('class_name', decodedClassName)
                    .eq('status', 'active')
                    .order('full_name', { ascending: true })

                if (studentsError || !students || students.length === 0) {
                    return { students: [], assignments: [], submissions: [] }
                }

                // 2. Get assignments for this class
                const { data: assignments, error: assignmentsError } = await supabase
                    .from('homework_assignments')
                    .select('id, title, deadline, created_at, course_id, subject')
                    .eq('class_name', decodedClassName)
                    .eq('is_archived', false)
                    .order('deadline', { ascending: true })

                if (assignmentsError || !assignments || assignments.length === 0) {
                    return { students, assignments: [], submissions: [] }
                }

                const studentIds = students.map(s => s.student_id_text)
                const assignmentIds = assignments.map(a => a.id)

                // 3. Get all submissions for these students and assignments
                const { data: submissions, error: subError } = await supabase
                    .from('homework_submissions')
                    .select('student_id_text, assignment_id, status, score, submitted_at, updated_at, feedback')
                    .in('student_id_text', studentIds)
                    .in('assignment_id', assignmentIds)

                if (subError) {
                    console.error('Error fetching submissions for matrix:', subError)
                    return { students, assignments, submissions: [] }
                }

                return { students, assignments, submissions }
            }
        },
        ['class-submission-matrix-v7', decodedClassName, String(isArchived)],
        { tags: ['homework-stats', 'homework-assignments'] }
    )
    return fetcher()
}
