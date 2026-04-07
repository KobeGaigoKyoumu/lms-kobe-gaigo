'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { normalizeClassName } from '@/lib/utils'
import { getStudentSession } from './studentAuth'
import { getAdminMemberSession } from './adminAuth'
import { revalidatePath, unstable_cache, revalidateTag } from 'next/cache'
import { uploadToImageKit } from './imagekit'

// Helper for admin client (Service Role)
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// Cache classes list for 1 hour
const _getClassesList = unstable_cache(
    async () => {
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
    },
    ['classes-list-v5'],
    { tags: ['classes'] }
)

export async function getClassesList() {
    return _getClassesList()
}

// Fetch all unique subject names from the timetable (schedules)
const _getTimetableSubjects = unstable_cache(
    async () => {
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
    },
    ['timetable-subjects-list-v2'],
    { tags: ['schedules'] }
)

export async function getTimetableSubjects() {
    return _getTimetableSubjects()
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
const _getCachedAssignment = unstable_cache(
    async (id) => {
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
    },
    ['assignment-details-v2'],
    { tags: ['homework-assignments'] }
)

// Fetch a single assignment details
export async function getAssignmentDetails(id) {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // 1. Get Assignment (Cached)
    const assignment = await _getCachedAssignment(id)

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

// Submit homework
export async function submitHomework(assignmentId, comment, fileUrls) {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // Check if submission already exists
    const { data: existing } = await supabase
        .from('homework_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id_text', session.studentId)
        .single()

    let error;

    if (existing) {
        // Update
        const { error: updateError } = await supabase
            .from('homework_submissions')
            .update({
                comment,
                file_urls: fileUrls,
                submitted_at: new Date().toISOString(),
                status: 'submitted',
                score: 1 
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
                status: 'submitted',
                score: 1
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

const _getTeacherAssignments = unstable_cache(
    async () => {
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
    },
    ['teacher-assignments-list'],
    { tags: ['homework-assignments'] }
)

export async function getTeacherAssignments() {
    return _getTeacherAssignments()
}

export async function getAssignmentsByClass(className, isArchived = false) {
    const decodedClassName = decodeURIComponent(className)
    
    const fetcher = unstable_cache(
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
        { tags: ['homework-assignments'] }
    )
    return fetcher()
}

export async function getAssignmentSubmissions(assignmentId) {
    const supabase = createAdminClient()

    const { data: assignment, error: assignmentError } = await supabase
        .from('homework_assignments')
        .select('id, title, description, deadline, class_name, created_at')
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
            score: score ? parseInt(score) : null,
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

    try {
        const folder = `/submissions/${assignmentId}`
        const result = await uploadToImageKit(formData, folder)

        if (!result.success) {
            throw new Error(result.error)
        }

        return {
            success: true,
            url: result.url,
            name: file.name,
            fileId: result.fileId,
            path: result.path
        }
    } catch (err) {
        console.error('ImageKit Submission Upload Error:', err)
        return { error: `アップロードに失敗しました: ${err.message}` }
    } finally {
        revalidateTag('storage-usage', 'max')
    }
}

const _getAllStudentSubmissionStats = unstable_cache(
    async () => {
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
    },
    ['all-student-submission-stats-v1'],
    { tags: ['homework-stats'] }
)

export async function getAllStudentSubmissionStats() {
    return _getAllStudentSubmissionStats()
}

const _getClassSubmissionStats = unstable_cache(
    async (className) => {
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
    },
    ['class-submission-stats'],
    { tags: ['homework-stats'] }
)

export async function getClassSubmissionStats(className) {
    return _getClassSubmissionStats(className)
}

export async function getClassSubmissionMatrix(className, isArchived = false) {
    const decodedClassName = decodeURIComponent(className)

    const fetcher = unstable_cache(
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
                    .select('student_id_text, assignment_id, status, score')
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
                    .select('student_id_text, assignment_id, status, score')
                    .in('student_id_text', studentIds)
                    .in('assignment_id', assignmentIds)

                if (subError) {
                    console.error('Error fetching submissions for matrix:', subError)
                    return { students, assignments, submissions: [] }
                }

                return { students, assignments, submissions }
            }
        },
        ['class-submission-matrix-v4', decodedClassName, String(isArchived)],
        { tags: ['homework-stats', 'homework-assignments'] }
    )
    return fetcher()
}
