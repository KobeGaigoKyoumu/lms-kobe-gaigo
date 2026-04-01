'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

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
            .select('student_id_text, full_name, class_name, academic_year, enrollment_period')
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
            academicYear: student.academic_year, 
            enrollmentPeriod: student.enrollment_period,
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
 * Lightweight session check - cookie only, NO DB access.
 * Use this for auth guards (login redirects, layout checks) where
 * you only need to know IF a student is logged in, not fresh DB data.
 */
export async function getStudentSessionLight() {
    try {
        const cookieStore = await cookies()
        const encoded = cookieStore.get(COOKIE_NAME)?.value ||
            cookieStore.get('kobe_student_session_v1')?.value ||
            cookieStore.get('student_id_session')?.value

        if (!encoded) return null

        try {
            const json = Buffer.from(encoded, 'base64').toString('utf8')
            const data = JSON.parse(json)
            if (data.studentId && data.name) {
                return {
                    studentId: data.studentId,
                    name: data.name,
                    className: data.className || '未設定',
                    academicYear: data.academicYear,
                    enrollmentPeriod: data.enrollmentPeriod
                }
            }
            if (data.studentId) {
                return { studentId: data.studentId, name: '学生', className: '未設定' }
            }
        } catch {
            // Legacy plain studentId cookie
            if (encoded && encoded.length > 0) {
                return { studentId: encoded, name: '学生', className: '未設定' }
            }
        }
        return null
    } catch {
        return null
    }
}

/**
 * Get the current student session.
 * Now retrieves data directly from the cookie (Base64) for maximum speed and stability.
 */
export const getStudentSession = cache(async () => {
    try {
        const cookieStore = await cookies()
        const encoded = cookieStore.get(COOKIE_NAME)?.value ||
            cookieStore.get('kobe_student_session_v1')?.value ||
            cookieStore.get('student_id_session')?.value

        // 1. Check Passcode Cookie (Fastest - No DB hit if Base64 is valid)
        if (encoded) {
            try {
                // If it's the Base64 version
                const json = Buffer.from(encoded, 'base64').toString('utf8')
                const data = JSON.parse(json)
                // クッキーから基本情報は取得するが、クラス名や学年などは学年リセット等で変更される可能性があるため
                // 毎回DBから最新の情報を取得するよう方針変更（cacheされているためリクエスト毎に1回のみ）
                if (data.studentId && data.name) {
                    try {
                        const supabase = createAdminClient()
                        const { data: latestData } = await supabase
                            .from('students')
                            .select('class_name, academic_year, enrollment_period, status')
                            .eq('student_id_text', data.studentId)
                            .single()
                        
                        if (latestData) {
                            return {
                                studentId: data.studentId,
                                name: data.name,
                                className: latestData.class_name || data.className || '未設定',
                                academicYear: latestData.academic_year || data.academicYear,
                                enrollmentPeriod: latestData.enrollment_period || data.enrollmentPeriod,
                                status: latestData.status
                            }
                        }
                    } catch (e) {
                        // DB fetch failed, fallback to purely cookie data
                    }

                    return {
                        studentId: data.studentId,
                        name: data.name,
                        className: data.className,
                        academicYear: data.academicYear,
                        enrollmentPeriod: data.enrollmentPeriod
                    }
                }

                // Fallback fetch only if missing essential data (one-time migration)
                if (data.studentId) {
                    const supabase = createAdminClient()
                    const { data: stData } = await supabase
                        .from('students')
                        .select('class_name, academic_year, enrollment_period')
                        .eq('student_id_text', data.studentId)
                        .single()
                    
                    if (stData) {
                        return {
                            studentId: data.studentId,
                            name: data.name,
                            className: stData.class_name,
                            academicYear: stData.academic_year,
                            enrollmentPeriod: stData.enrollment_period
                        }
                    }
                }
            } catch {
                // Legacy ID-only fallback (one-time DB hit)
                const supabase = createAdminClient()
                const { data: student } = await supabase
                    .from('students')
                    .select('student_id_text, full_name, class_name, academic_year, enrollment_period')
                    .eq('student_id_text', encoded)
                    .single()

                if (student) {
                    return {
                        studentId: student.student_id_text,
                        name: student.full_name,
                        className: student.class_name,
                        academicYear: student.academic_year,
                        enrollmentPeriod: student.enrollment_period
                    }
                }
            }
        }

        // 2. Check Supabase User (Google Login)
        // Skip if a cookie-based session was already found to save CPU
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession() // getSession is faster than getUser for simple presence check
        const user = session?.user

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, student_id_text, full_name')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'student' && profile.student_id_text) {
                // Use a short cache for the master data fetch if needed, 
                // but usually we can assume the profile is correct or fetch once.
                const { data: studentMaster } = await supabase
                    .from('students')
                    .select('class_name, academic_year, enrollment_period')
                    .eq('student_id_text', profile.student_id_text)
                    .single()

                return {
                    studentId: profile.student_id_text,
                    name: profile.full_name,
                    className: studentMaster?.class_name || '未設定',
                    academicYear: studentMaster?.academic_year,
                    enrollmentPeriod: studentMaster?.enrollment_period
                }
            }
        }

        return null
    } catch (e) {
        return null
    }
})
