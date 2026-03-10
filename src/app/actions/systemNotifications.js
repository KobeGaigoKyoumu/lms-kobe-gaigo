'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const createAdminClient = () => {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

const SYSTEM_STUDENT_ID = 'SYSTEM_REMINDER'

export async function getSystemNotifications(teacherId) {
    const supabase = createAdminClient()

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', SYSTEM_STUDENT_ID)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        console.error('Fetch system notifications error:', error)
        return []
    }

    return messages || []
}

export async function getUnreadSystemCount(teacherId) {
    const supabase = createAdminClient()

    const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', SYSTEM_STUDENT_ID)
        .eq('teacher_id', teacherId)
        .eq('read', false)

    if (error) {
        console.error('Fetch unread system count error:', error)
        return 0
    }

    return count || 0
}

export async function markSystemNotificationsRead(teacherId) {
    const supabase = createAdminClient()

    const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('student_id', SYSTEM_STUDENT_ID)
        .eq('teacher_id', teacherId)
        .eq('read', false)

    if (error) {
        console.error('Mark system notifications read error:', error)
        return false
    }

    return true
}
