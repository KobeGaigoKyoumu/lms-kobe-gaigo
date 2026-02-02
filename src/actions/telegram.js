'use server'

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStudentSession } from "@/app/actions/studentAuth"

export async function getTelegramStatus(injectedSession = null) {
    const supabase = await createClient()

    // 1. Try Supabase Auth (Teacher/Admin)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // Authenticated as User (Teacher/Admin/Student with Auth)
        const { data: student } = await supabase
            .from('students')
            .select('student_id_text, telegram_chat_id')
            .eq('user_id', user.id)
            .single()

        if (student) {
            return {
                connected: !!student.telegram_chat_id,
                studentId: student.student_id_text,
                debug: { source: 'supabase_auth', userId: user.id }
            }
        }

        console.log('[TelegramStatus] User found but no student profile. Falling through to session check.')
    }

    // 2. Try Student Session (Cookie-based Student)
    const studentSession = injectedSession || await getStudentSession()
    console.log('[TelegramStatus] Student Session:', studentSession)

    if (studentSession && studentSession.studentId) {
        // Use admin client to bypass RLS for session-based access
        const adminSupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const { data: student, error } = await adminSupabase
            .from('students')
            .select('student_id_text, telegram_chat_id')
            .eq('student_id_text', studentSession.studentId)
            .single()

        console.log('[TelegramStatus] Admin Query Result:', { student, error })

        if (!student) {
            console.warn('[TelegramStatus] Student not found in DB via session ID. Fallback to session ID.')
            return { connected: false, studentId: studentSession.studentId }
        }

        return {
            connected: !!student.telegram_chat_id,
            studentId: student.student_id_text
        }
    }

    console.log('[TelegramStatus] No session found')
    return {
        connected: false,
        studentId: null,
        debug: {
            message: 'No session found (final fallback)',
            injected: !!injectedSession,
            sessionFound: !!studentSession
        }
    }
}

export async function disconnectTelegram() {
    const supabase = await createClient()

    // 1. Try Supabase Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { error } = await supabase
            .from('students')
            .update({ telegram_chat_id: null })
            .eq('user_id', user.id)

        if (error) {
            console.error('Error disconnecting Telegram (User):', error)
            return { success: false, error: error.message }
        }
        return { success: true }
    }

    // 2. Try Student Session
    const studentSession = await getStudentSession()
    if (studentSession && studentSession.studentId) {
        const { error } = await supabase
            .from('students')
            .update({ telegram_chat_id: null })
            .eq('student_id_text', studentSession.studentId)

        if (error) {
            console.error('Error disconnecting Telegram (Session):', error)
            return { success: false, error: error.message }
        }
        return { success: true }
    }

    return { success: false, error: 'User not authenticated' }
}

export async function getBotUsername() {
    return process.env.TELEGRAM_BOT_USERNAME || null
}

/**
 * Send Telegram Broadcast
 */
export async function sendTelegramBroadcast(message, targetType, targetValue) {
    const supabase = await createClient()
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

    if (!TELEGRAM_BOT_TOKEN) {
        return { success: false, error: 'Telegram Bot Token is missing.' }
    }

    try {
        // 1. Fetch Target Students
        let query = supabase.from('students').select('student_id_text, telegram_chat_id, full_name').not('telegram_chat_id', 'is', null)

        if (targetType === 'grade') {
            const currentYear = new Date().getFullYear()
            const today = new Date()
            const isBeforeApril = today.getMonth() < 3
            const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear
            const targetAY = academicYearBase - (parseInt(targetValue) - 1)
            query = query.eq('academic_year', targetAY)
        } else if (targetType === 'class') {
            query = query.eq('class_name', targetValue)
        } else if (targetType === 'students' || targetType === 'individual') {
            const ids = Array.isArray(targetValue) ? targetValue : [targetValue]
            query = query.in('student_id_text', ids)
        } else if (targetType === 'course') {
            // Fetch students enrolled in the course
            const { data: enrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select('student_id')
                .eq('course_id', targetValue)

            if (enrollError) throw enrollError

            const studentIds = enrollments.map(e => e.student_id)
            if (studentIds.length === 0) {
                return { success: true, count: 0, message: 'No students enrolled in this course.' }
            }

            // Resolve UUID -> student_id_text
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('student_id_text')
                .in('id', studentIds)

            if (profileError) throw profileError

            const finalStudentIds = profiles.map(p => p.student_id_text).filter(Boolean)
            query = query.in('student_id_text', finalStudentIds)
        }

        const { data: students, error } = await query

        if (error) {
            console.error("Supabase Error:", error)
            return { success: false, error: error.message }
        }

        if (!students || students.length === 0) {
            return { success: true, count: 0, message: 'No linked students found for this target on Telegram.' }
        }

        // 2. Send Messages
        let sentCount = 0
        let failedCount = 0
        const errors = []

        await Promise.all(students.map(async (student) => {
            const result = await sendToTelegramChat(student.telegram_chat_id, message, TELEGRAM_BOT_TOKEN)
            if (result.success) {
                sentCount++
            } else {
                failedCount++
                errors.push({ student: student.full_name, error: result.error })
            }
        }))

        return {
            success: true,
            count: sentCount,
            failed: failedCount,
            details: failedCount > 0 ? errors : null
        }

    } catch (err) {
        console.error("Telegram Broadcast Error:", err)
        return { success: false, error: err.message }
    }
}

async function sendToTelegramChat(chatId, text, token) {
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text
            })
        })

        const data = await response.json()
        if (!data.ok) {
            return { success: false, error: data.description }
        }
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}
