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
// 1 year in seconds
const MAX_AGE = 60 * 60 * 24 * 365

export async function loginStudent(formData) {
    const className = formData.get('className')
    const studentId = formData.get('studentId')

    if (!className || !studentId) {
        return { error: 'クラス名と学籍番号を入力してください。' }
    }

    try {
        const supabase = createAdminClient()

        // 1. Verify existence in students table
        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('student_id_text', studentId.trim())
            .eq('class_name', className.trim())
            .single()

        if (error || !student) {
            return { error: 'ログイン情報が正しくありません。' }
        }

        // 2. Create Session Data
        const sessionData = {
            studentId: student.student_id_text,
            name: student.full_name,
            className: student.class_name,
            loggedInAt: new Date().toISOString()
        }

        const cookieStore = await cookies()

        // Use set with options that are most compatible with mobile browsers
        cookieStore.set(COOKIE_NAME, JSON.stringify(sessionData), {
            httpOnly: true,
            secure: true,
            maxAge: MAX_AGE,
            path: '/',
            sameSite: 'lax',
            priority: 'high'
        })

    } catch (e) {
        console.error('Student Login Critical Error:', e)
        return { error: 'システムエラーが発生しました。' }
    }

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
        // Double check it's a valid JSON
        return JSON.parse(session.value)
    } catch (e) {
        return null
    }
}
