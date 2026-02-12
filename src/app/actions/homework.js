'use server'

import { createClient } from '@/lib/supabase/server'
import { getStudentSession } from './studentAuth'
import { revalidatePath } from 'next/cache'

// Helper for admin client (Service Role)
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const { createClient } = require('@supabase/supabase-js')
    return createClient(supabaseUrl, supabaseServiceKey)
}

export async function getClassesList() {
    const supabase = await createClient()
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Fetch classes error:', error)
        return []
    }
    return classes
}

// Fetch active assignments for the student's class
export async function getStudentAssignments() {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // 1. Get assignments for the class
    const { data: assignments, error: assignmentError } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('class_name', session.className)
        .order('deadline', { ascending: true })
        .limit(100)

    if (assignmentError) {
        console.error('Error fetching assignments:', assignmentError)
        return []
    }

    // 2. Get student's submissions for these assignments
    // We can fetch all submissions for this student, or filter by the assignment IDs we just got.
    // Fetching all for student is simpler and likely fine for now.
    const { data: submissions, error: submissionError } = await supabase
        .from('homework_submissions')
        .select('id, assignment_id, status, submitted_at, score')
        .eq('student_id_text', session.studentId)

    if (submissionError) {
        console.error('Error fetching submissions:', submissionError)
        // Return assignments without submission status if error occurs (better than nothing)
        return assignments.map(a => ({ ...a, submission: null }))
    }

    // 3. Merge
    const submissionMap = new Map()
    submissions.forEach(s => submissionMap.set(s.assignment_id, s))

    return assignments.map(a => ({
        ...a,
        submission: submissionMap.get(a.id) || null
    }))
}

// Fetch a single assignment details
export async function getAssignmentDetails(id) {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // 1. Get Assignment
    const { data: assignment, error: assignmentError } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('id', id)
        .eq('class_name', session.className) // Ensure student belongs to class
        .single()

    if (assignmentError || !assignment) return null

    // 2. Get Submission
    const { data: submission, error: submissionError } = await supabase
        .from('homework_submissions')
        .select('*')
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

    revalidatePath(`/student/homework/${assignmentId}`)
    revalidatePath('/student/dashboard')
    return { success: true }
}

// --- Teacher Actions ---

// Create a new assignment
export async function createAssignment(formData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Unauthorized' }
    }

    const title = formData.get('title')
    const description = formData.get('description')
    const className = formData.get('className')
    const deadline = formData.get('deadline') // ISO string

    if (!title || !className || !deadline) {
        return { error: '必須項目を入力してください' }
    }

    const { data: newAssignment, error } = await supabase
        .from('homework_assignments')
        .insert({
            title,
            description,
            class_name: className,
            deadline,
            teacher_id: user.id
        })
        .select('id')
        .single()

    if (error) {
        console.error('Create assignment error:', error)
        return { error: '作成に失敗しました' }
    }

    revalidatePath('/assignments')
    return { success: true, id: newAssignment.id }
}

// Fetch all assignments for teacher list
export async function getTeacherAssignments() {
    const supabase = await createClient()

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
}

// Fetch assignments for a specific class (Teacher view helper)
export async function getAssignmentsByClass(className) {
    const supabase = await createClient()

    // Decode URL component just in case, though usually handled by Next.js params
    const decodedClassName = decodeURIComponent(className)

    const { data: assignments, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('class_name', decodedClassName)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Fetch assignments by class error:', error)
        return []
    }

    return assignments
}

// Fetch assignment with submissions for grading
export async function getAssignmentSubmissions(assignmentId) {
    // For grading, we need to join student names from 'students' table.
    // Since 'students' table policies rely on profiles/auth role, an authenticated teacher can read it.
    // However, the relationship assumes 'students' table is foreign keyed properly.
    // If not, we might need a manual join. But let's try the join first if FK exists.
    // If no FK, we fetch manually.

    const supabase = await createClient()

    // 1. Fetch Assignment
    const { data: assignment, error: assignmentError } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()

    if (assignmentError) return null

    // 2. Fetch Submissions
    // We can also fetch the student info if joined.
    // homework_submissions references students(student_id_text).

    const { data: submissions, error: subError } = await supabase
        .from('homework_submissions')
        .select(`
            *,
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
    const supabase = await createClient()

    const { error } = await supabase
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

    revalidatePath('/assignments/[id]', 'page')
    return { success: true }
}

// Upload file securely (for students)
import { uploadFileToDrive } from '@/lib/googleDrive'

export async function uploadSubmissionFile(formData) {
    const session = await getStudentSession()
    if (!session) return { error: 'Unauthorized' }

    const file = formData.get('file')
    const assignmentId = formData.get('assignmentId')

    if (!file || !assignmentId) {
        return { error: 'ファイルまたは課題IDが無効です' }
    }

    try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Google Drive
        const uploadedFile = await uploadFileToDrive(
            buffer,
            file.name,
            file.type
        )

        return {
            success: true,
            url: uploadedFile.url,
            name: uploadedFile.name,
            driveId: uploadedFile.id // 将来的な削除用
        }
    } catch (err) {
        console.error('Google Drive upload error:', err)
        return { error: 'アップロードに失敗しました (Google Drive)' }
    }
}

// --- Stats Helpers ---

// Get submission stats for all students (Admin use)
export async function getAllStudentSubmissionStats() {
    const supabase = createAdminClient()

    // We need to fetch all submissions to aggregate.
    // Ideally we'd use a database view or RPC, but simple aggregation in JS is fine for now.
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
}

// Get submission stats for a specific class (Teacher use)
export async function getClassSubmissionStats(className) {
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
}
