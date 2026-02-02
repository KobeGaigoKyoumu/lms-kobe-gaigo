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
        throw new Error('Server configuration error')
    }

    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// FRESH COOKIE NAME to clear any previous corrupted state
const COOKIE_NAME = 'kobe_student_session_v1'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

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
        const expiryDate = new Date(Date.now() + ONE_YEAR_MS)

        // Use a simple string value with explicit expires and Max-Age
        cookieStore.set(COOKIE_NAME, student.student_id_text, {
            httpOnly: true,
            secure: true,
            maxAge: ONE_YEAR_MS / 1000,
            expires: expiryDate,
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
    // Clear old versions too
    cookieStore.delete('student_id_session')
    cookieStore.delete('student_session')
    redirect('/login')
}

export const getStudentSession = cache(async () => {
    const cookieStore = await cookies()
    const studentId = cookieStore.get(COOKIE_NAME)?.value || cookieStore.get('student_id_session')?.value

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
