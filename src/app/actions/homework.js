'use server'

import { createClient } from '@/lib/supabase/client'
import { getStudentSession } from './studentAuth'
import { revalidatePath } from 'next/cache'

// Helper for admin client (Service Role)
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const { createClient } = require('@supabase/supabase-js')
    return createClient(supabaseUrl, supabaseServiceKey)
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
                status: 'submitted' // Reset status if re-submitted
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
                status: 'submitted'
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
    const supabase = createClient()
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

    const { error } = await supabase
        .from('homework_assignments')
        .insert({
            title,
            description,
            class_name: className,
            deadline,
            teacher_id: user.id
        })

    if (error) {
        console.error('Create assignment error:', error)
        return { error: '作成に失敗しました' }
    }

    revalidatePath('/assignments')
    return { success: true }
}

// Fetch all assignments for teacher list
export async function getTeacherAssignments() {
    const supabase = createClient()

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

// Fetch assignment with submissions for grading
export async function getAssignmentSubmissions(assignmentId) {
    // For grading, we need to join student names from 'students' table.
    // Since 'students' table policies rely on profiles/auth role, an authenticated teacher can read it.
    // However, the relationship assumes 'students' table is foreign keyed properly. 
    // If not, we might need a manual join. But let's try the join first if FK exists.
    // If no FK, we fetch manually.

    const supabase = createClient()

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
    const supabase = createClient()

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
