'use server'

import { createClient } from '@/lib/supabase/client' // Note: For server actions using service role we might need a different client setup if bypassing RLS, but standard client is fine if we use public queries or proper auth. 
// Actually for verifying students we need to query 'students' table. RLS allows read for auth users. 
// But here the user is NOT authenticated via Supabase Auth yet.
// So we need a Service Role client to check credentials if 'students' table is protected.
// 'students' table policy: "Students are viewable by authenticated users". 
// This means unauthenticated users (Login page) cannot query it directly via client.
// So we MUST use Service Role here.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { process } from 'process' // implied

// Helper to create admin client
const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // We need to import createClient from supabase-js directly for service role
    const { createClient } = require('@supabase/supabase-js')
    return createClient(supabaseUrl, supabaseServiceKey)
}

const COOKIE_NAME = 'student_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 1 week

export async function loginStudent(formData) {
    const className = formData.get('className')
    const studentId = formData.get('studentId')

    if (!className || !studentId) {
        return { error: 'クラス名と学籍番号を入力してください。' }
    }

    const supabase = createAdminClient()

    // 1. Verify existence in students table
    const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', studentId)
        .eq('class_name', className)
        .single()

    if (error || !student) {
        console.error('Login failed:', error)
        return { error: 'ログイン情報が正しくありません。クラス名と学籍番号を確認してください。' }
    }

    // 2. Create Session (Cookie)
    // We store minimal info: ID and Class
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

    redirect('/student/dashboard')
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
