'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

// Helper to create admin client
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables')
        throw new Error('Server configuration error')
    }

    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

const COOKIE_NAME = 'student_id_session'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function loginStudent(formData) {
    const className = formData.get('className')
    const studentId = formData.get('studentId')

    if (!className || !studentId) {
        return { error: 'クラス名と学籍番号を入力してください。' }
    }

    try {
        const supabase = createAdminClient()

        // Verify student
        const { data: student, error } = await supabase
            .from('students')
            .select('student_id_text, full_name, class_name')
            .eq('student_id_text', studentId.trim())
            .eq('class_name', className.trim())
            .single()

        if (error || !student) {
            return { error: 'ログイン情報が正しくありません。' }
        }

        const cookieStore = await cookies()
        const expires = new Date(Date.now() + MAX_AGE * 1000)

        // Store ONLY the ID to avoid JSON encoding issues in mobile cookies
        cookieStore.set(COOKIE_NAME, student.student_id_text, {
            httpOnly: true,
            secure: true,
            maxAge: MAX_AGE,
            expires: expires,
            path: '/',
            sameSite: 'lax',
            priority: 'high'
        })

        return { success: true }
    } catch (e) {
        console.error('Login Error:', e)
        return { error: 'システムエラーが発生しました。' }
    }
}

export async function logoutStudent() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
    redirect('/login')
}

/**
 * Get the current student session.
 * Cached per-request to avoid multiple DB lookups.
 */
export const getStudentSession = cache(async () => {
    const cookieStore = await cookies()
    const studentId = cookieStore.get(COOKIE_NAME)?.value

    if (!studentId) return null

    try {
        const supabase = createAdminClient()
        const { data: student, error } = await supabase
            .from('students')
            .select('student_id_text, full_name, class_name')
            .eq('student_id_text', studentId)
            .single()

        if (error || !student) return null

        return {
            studentId: student.student_id_text,
            name: student.full_name,
            className: student.class_name
        }
    } catch (e) {
        return null
    }
})
