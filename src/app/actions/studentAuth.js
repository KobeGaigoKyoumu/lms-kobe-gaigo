'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

// Helper to create admin client
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Server configuration error')
    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// Version 2 cookie with Base64 encoding for stability
const COOKIE_NAME = 'kobe_student_session_v2'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

export async function loginStudent(formData) {
    const className = formData.get('className')
    const studentId = formData.get('studentId')

    if (!className || !studentId) {
        return { error: 'クラス名と学籍番号を入力してください。' }
    }

    try {
        const supabase = createAdminClient()
        const { data: student, error } = await supabase
            .from('students')
            .select('student_id_text, full_name, class_name')
            .eq('student_id_text', studentId.trim())
            .eq('class_name', className.trim())
            .single()

        if (error || !student) {
            return { error: 'ログイン情報が正しくありません。' }
        }

        const sessionData = {
            studentId: student.student_id_text,
            name: student.full_name,
            className: student.class_name,
            at: Date.now()
        }

        // Encode to Base64 to avoid any character issues in mobile cookies
        const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64')

        const cookieStore = await cookies()
        const expiryDate = new Date(Date.now() + ONE_YEAR_MS)

        cookieStore.set(COOKIE_NAME, encodedSession, {
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
        return { error: 'ログイン処理中にエラーが発生しました。' }
    }
}

export async function logoutStudent() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
    // Cleanup old versions
    cookieStore.delete('kobe_student_session_v1')
    cookieStore.delete('student_id_session')
    redirect('/login')
}

/**
 * Get the current student session.
 * Now retrieves data directly from the cookie (Base64) for maximum speed and stability.
 */
export const getStudentSession = cache(async () => {
    try {
        const cookieStore = await cookies()
        const encoded = cookieStore.get(COOKIE_NAME)?.value || cookieStore.get('kobe_student_session_v1')?.value

        if (!encoded) return null

        // Decode from Base64
        // If it's the old version (just ID), this might fail, handled by catch
        const json = Buffer.from(encoded, 'base64').toString('utf8')
        const data = JSON.parse(json)

        return {
            studentId: data.studentId,
            name: data.name,
            className: data.className
        }
    } catch (e) {
        // Fallback for simple ID-only cookies or corrupted data
        return null
    }
})
