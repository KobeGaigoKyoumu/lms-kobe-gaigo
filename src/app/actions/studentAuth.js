'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Helper to create admin client
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables for Service Role')
        throw new Error('Server configuration error')
    }

    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

const COOKIE_NAME = 'student_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 1 week

export async function loginStudent(formData) {
    try {
        const className = formData.get('className') // .trim()?
        const studentId = formData.get('studentId')

        if (!className || !studentId) {
            return { error: 'クラス名と学籍番号を入力してください。' }
        }

        const supabase = createAdminClient()

        // 1. Verify existence in students table
        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('student_id_text', studentId.trim()) // Trim whitespace from ID
            .eq('class_name', className.trim())
            .single()

        if (error || !student) {
            console.error('Login Query Failed:', error)
            return { error: 'ログイン情報が正しくありません。クラス名と学籍番号を確認してください。' }
        }

        // 2. Create Session (Cookie)
        const sessionData = {
            studentId: student.student_id_text,
            name: student.full_name,
            className: student.class_name,
            loggedInAt: new Date().toISOString()
        }

        const cookieStore = await cookies()
        cookieStore.set(COOKIE_NAME, JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: MAX_AGE,
            path: '/',
        })

    } catch (e) {
        console.error('Student Login Critical Error:', e)
        // DEBUG: Return the actual error message to the client to verify if it is Env var issue or redirect issue
        return { error: `システムエラー: ${e.message}` }
    }

    // Redirect needs to be outside try-catch because it throws a special error in Next.js
    // ensure this path is reachable only if no error occurred above
    // redirect('/student/dashboard') // Causing NEXT_REDIRECT error on client catch
    return { success: true }
}

export async function logoutStudent() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
    redirect('/login')
}

export async function getStudentSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get(COOKIE_NAME)

    if (!session) return null

    try {
        return JSON.parse(session.value)
    } catch (e) {
        return null
    }
}
