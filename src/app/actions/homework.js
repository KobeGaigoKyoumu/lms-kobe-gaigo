'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getStudentSession } from './studentAuth'
import { getAdminMemberSession } from './adminAuth'
import { revalidatePath, unstable_cache, revalidateTag } from 'next/cache'

// Helper for admin client (Service Role)
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// Cache classes list for 1 hour
export const getClassesList = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const { data: classes, error } = await supabase
            .from('classes')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            console.error('Fetch classes error:', error)
            return []
        }
        return classes
    },
    ['classes-list'],
    { revalidate: 3600, tags: ['classes'] }
)

// ...

// Internal cached function for student assignments
const _getStudentAssignments = unstable_cache(
    async (studentId, className) => {
        const supabase = createAdminClient()

        // 1. Get assignments for the class currently
        const { data: activeAssignments, error: activeError } = await supabase
            .from('homework_assignments')
            .select('id, title, description, deadline, class_name, created_at')
            .eq('class_name', className)
            .eq('is_archived', false)
            .order('deadline', { ascending: true })
            .limit(100)

        if (activeError) {
            console.error('Error fetching active assignments:', activeError)
            return { active: [], archived: [] }
        }

        // 2. Get student's all submissions (past and present)
        const { data: submissions, error: submissionError } = await supabase
            .from('homework_submissions')
            .select('id, assignment_id, status, submitted_at, score')
            .eq('student_id_text', studentId)

        if (submissionError) {
            console.error('Error fetching submissions:', submissionError)
            return {
                active: activeAssignments.map(a => ({ ...a, submission: null })),
                archived: []
            }
        }

        const submissionMap = new Map()
        ;(submissions || []).forEach(s => submissionMap.set(s.assignment_id, s))

        // 3. To get the details of archived assignments or assignments from previous classes
        const activeAssignmentIds = new Set((activeAssignments || []).map(a => a.id))
        const submittedAssignmentIds = (submissions || []).map(s => s.assignment_id)
        
        // Find past assignment IDs that the student has submitted to, but are not in the current active list
        const pastIdsToFetch = submittedAssignmentIds.filter(id => !activeAssignmentIds.has(id))

        let archivedAssignments = []
        if (pastIdsToFetch.length > 0) {
            const { data: pastAssignmentsData } = await supabase
                .from('homework_assignments')
                .select('id, title, description, deadline, class_name, created_at')
                .in('id', pastIdsToFetch)
                .order('created_at', { ascending: false })
            
            archivedAssignments = pastAssignmentsData || []
        }

        const active = (activeAssignments || []).map(a => ({
            ...a,
            submission: submissionMap.get(a.id) || null
        }))

        const archived = archivedAssignments.map(a => ({
            ...a,
            submission: submissionMap.get(a.id) || null
        }))

        return { active, archived }
    },
    ['student-assignments-v1'],
    { revalidate: 3600, tags: ['homework-assignments'] } // Base tag, dynamic tags are not supported in options object directly this way usually?
    // Wait, dynamic tags in options? No, tags must be static array?
    // Actually, we can just use a broad tag 'homework-assignments' for now, or include student ID in key.
    // Revalidation by tag 'homework-assignments' will clear ALL students cache? That's okay for now.
    // Better: use `tags: ['homework-assignments', `student-${studentId}`]`?
    // unstable_cache options object takes tags array. It can be dynamic if I pass a function?
    // No, the third arg is options.
    // Let's stick to simple key-based caching for now, and revalidatePath.
)

// Fetch active assignments for the student's class
export async function getStudentAssignments() {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    return await _getStudentAssignments(session.studentId, session.className)
}

// Internal cached assignment fetcher
const _getCachedAssignment = unstable_cache(
    async (id) => {
        const supabase = createAdminClient()
        const { data: assignment, error } = await supabase
            .from('homework_assignments')
            .select('id, title, description, deadline, class_name, created_at, teacher_id')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching assignment:', error)
            return null
        }
        return assignment
    },
    ['assignment-details-v1'], // We'll append ID? unstable_cache handles args automatically if passed
    { revalidate: 3600, tags: ['homework-assignments'] }
)

// Fetch a single assignment details
export async function getAssignmentDetails(id) {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // 1. Get Assignment (Cached)
    const assignment = await _getCachedAssignment(id)

    if (!assignment) return null

    // Security check: Ensure student belongs to class
    // Decode if one is encoded and other is not? usually straight comparison
    if (assignment.class_name !== session.className && decodeURIComponent(assignment.class_name) !== session.className) {
        // Allow if it's encoded differently?
        // Just strictly check.
        if (assignment.class_name !== session.className) {
            console.warn('Unauthorized assignment access attempt:', session.studentId, id)
            return null
        }
    }

    // 2. Get Submission (Uncached - User specific)
    const { data: submission, error: submissionError } = await supabase
        .from('homework_submissions')
        .select('id, assignment_id, student_id_text, status, submitted_at, score, comment, file_urls, feedback, updated_at')
        .eq('assignment_id', id)
        .eq('student_id_text', session.studentId)
        .single()

    // It's okay if submission doesn't exist (not submitted yet)

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
                status: 'submitted', // Reset status if re-submitted
                score: 1 // Automatic 1 point for submission
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
                score: 1 // Automatic 1 point for submission
            })
        error = insertError
    }

    if (error) {
        console.error('Submission error:', error)
        return { error: '提出に失敗しました。' }
    }

    revalidateTag('homework-stats')
    revalidateTag('homework-assignments') // Clear cache so student dashboard updates status
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
    const className = formData.get('className')
    let deadline = formData.get('deadline') // ISO string from datetime-local

    if (!title || !className || !deadline) {
        return { error: '必須項目を入力してください' }
    }

    // datetime-local input returns "YYYY-MM-DDTHH:mm" without timezone.
    // Force JST (+09:00) so it's not unintentionally parsed as UTC by the server environment.
    if (deadline && !deadline.includes('Z') && !deadline.includes('+')) {
        deadline = `${deadline}:00+09:00`
    }

    const adminSupabase = createAdminClient()
    const { data: newAssignment, error } = await adminSupabase
        .from('homework_assignments')
        .insert({
            title,
            description,
            class_name: className,
            deadline,
            teacher_id: user?.id || null
        })
        .select('id')
        .single()

    if (error) {
        console.error('Create assignment error:', error)
        return { error: '作成に失敗しました' }
    }

    revalidateTag('homework-assignments')
    revalidatePath('/assignments')
    return { success: true, id: newAssignment.id }
}

export async function updateAssignmentDeadline(assignmentId, newDeadline) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    if (!user && !adminMember) {
        return { error: 'Unauthorized' }
    }

    // datetime-local input returns "YYYY-MM-DDTHH:mm" without timezone.
    let parsedDeadline = newDeadline
    if (parsedDeadline && !parsedDeadline.includes('Z') && !parsedDeadline.includes('+')) {
        parsedDeadline = `${parsedDeadline}:00+09:00`
    }

    const adminSupabase = createAdminClient()
    let query = adminSupabase
        .from('homework_assignments')
        .update({ deadline: parsedDeadline })
        .eq('id', assignmentId)

    // Only restrict to teacher's own assignments for non-admin users
    if (user && !adminMember) {
        query = query.eq('teacher_id', user.id)
    }

    const { error } = await query

    if (error) {
        console.error('Update deadline error:', error)
        return { error: '期限の更新に失敗しました' }
    }

    revalidateTag('homework-assignments')
    revalidatePath(`/assignments/${assignmentId}`)
    revalidatePath('/assignments')
    return { success: true }
}

// Fetch all assignments for teacher list (Cached)
export const getTeacherAssignments = unstable_cache(
    async () => {
        const supabase = createAdminClient()

        // We want to get submission counts too.
        // This might be complex in one query with Supabase depending on foreign keys.
        // Let's just fetch assignments first.

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
    { revalidate: 3600, tags: ['homework-assignments'] }
)

// Fetch assignments for a specific class (Teacher view helper)
// Fetch assignments for a specific class (Cached)
export async function getAssignmentsByClass(className, isArchived = false) {
    const decodedClassName = decodeURIComponent(className)
    
    const fetcher = unstable_cache(
        async () => {
            const supabase = createAdminClient()
            const { data: assignments, error } = await supabase
                .from('homework_assignments')
                .select('*')
                .eq('class_name', decodedClassName)
                .eq('is_archived', isArchived)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Fetch assignments by class error:', error)
                return []
            }

            return assignments
        },
        ['class-assignments-v2', decodedClassName, String(isArchived)],
        { revalidate: 3600, tags: ['homework-assignments'] }
    )
    return fetcher()
}

// Fetch assignment with submissions for grading
export async function getAssignmentSubmissions(assignmentId) {
    const supabase = createAdminClient()

    // 1. Fetch Assignment
    const { data: assignment, error: assignmentError } = await supabase
        .from('homework_assignments')
        .select('id, title, description, deadline, class_name, created_at')
        .eq('id', assignmentId)
        .single()

    if (assignmentError) return null

    // 2. Fetch Submissions
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

// Grade a submission
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

    revalidateTag('homework-stats')
    revalidateTag('homework-assignments')
    revalidatePath('/assignments/[id]', 'page')
    return { success: true }
}

// Return a submission
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

    revalidateTag('homework-stats')
    revalidateTag('homework-assignments')
    revalidatePath('/assignments/[id]', 'page')
    return { success: true }
}

// Helper for admin client (Service Role) - defined at top of file
// const createAdminClient = () => { ... }

import { uploadToImageKit } from './imagekit'

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
    }
}



// Get submission stats for all students (Admin use)
export const getAllStudentSubmissionStats = unstable_cache(
    async () => {
        const supabase = createAdminClient()

        // We need to fetch all submissions to aggregate.
        const { data: submissions, error } = await supabase
            .from('homework_submissions')
            .select('student_id_text, score, status')

        if (error) {
            console.error('Error fetching all stats:', error)
            return []
        }

        // Aggregate by student_id_text
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

        // Convert to array
        return Array.from(statsMap.entries()).map(([studentId, stat]) => ({
            student_id_text: studentId,
            submission_count: stat.count,
            total_score: stat.totalScore
        }))
    },
    ['all-student-submission-stats-v1'],
    { revalidate: 3600, tags: ['homework-stats'] } // Cache for 1 hour
)

// Get submission stats for a specific class (Teacher use)
export const getClassSubmissionStats = unstable_cache(
    async (className) => {
        const supabase = createAdminClient()

        // 1. Get assignments for this class to filter submissions (optional but safer)
        // Actually, checking student's class membership is better, but submission table has student_id.
        // We can fetch submissions where student belongs to class, but that requires join.
        // Simpler: Fetch all submissions and filter by students in the class?
        // OR: Assume we want stats for *ALL* work done by students currently in this class.

        // Let's fetch students in class first
        const { data: students } = await supabase
            .from('students')
            .select('student_id_text')
            .eq('class_name', className)

        if (!students || students.length === 0) return []

        const studentIds = students.map(s => s.student_id_text)

        // 2. Fetch submissions for these students
        const { data: submissions, error } = await supabase
            .from('homework_submissions')
            .select('student_id_text, score, status')
            .in('student_id_text', studentIds)

        if (error) {
            console.error('Error fetching class stats:', error)
            return []
        }

        // 3. Aggregate
        const statsMap = new Map()
        // Initialize for all students in class (even if 0 submissions)
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
    { revalidate: 3600, tags: ['homework-stats'] }
)

// Get submission matrix for a class (Teacher use - submission status table)
export async function getClassSubmissionMatrix(className, isArchived = false) {
    const decodedClassName = decodeURIComponent(className)

    const fetcher = unstable_cache(
        async () => {
            const supabase = createAdminClient()

            // 1. Get students in this class
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('student_id_text, full_name')
                .eq('class_name', decodedClassName)
                .order('full_name', { ascending: true })

            if (studentsError || !students || students.length === 0) {
                return { students: [], assignments: [], submissions: [] }
            }

            // 2. Get assignments for this class (sorted by deadline)
            const { data: assignments, error: assignmentsError } = await supabase
                .from('homework_assignments')
                .select('id, title, deadline, created_at')
                .eq('class_name', decodedClassName)
                .eq('is_archived', isArchived)
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
        },
        ['class-submission-matrix-v2', decodedClassName, String(isArchived)],
        { revalidate: 3600, tags: ['homework-stats', 'homework-assignments'] }
    )
    return fetcher()
}
