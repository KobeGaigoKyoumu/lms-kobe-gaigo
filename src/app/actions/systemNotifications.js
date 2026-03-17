'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const createAdminClient = () => {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

const SYSTEM_STUDENT_ID = 'SYSTEM_REMINDER'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = (id) => typeof id === 'string' && UUID_REGEX.test(id)

export async function getSystemNotifications(teacherId) {
    const supabase = createAdminClient()

    let query = supabase
        .from('messages')
        .select('*')
        .eq('student_id', SYSTEM_STUDENT_ID)
        .order('created_at', { ascending: false })
        .limit(50)

    if (!isUUID(teacherId)) {
        query = query.is('teacher_id', null)
    } else {
        query = query.eq('teacher_id', teacherId)
    }

    const { data: messages, error } = await query

    if (error) {
        console.error('Fetch system notifications error:', error)
        return []
    }

    return messages || []
}

export async function getUnreadSystemCount(teacherId) {
    const supabase = createAdminClient()

    let query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', SYSTEM_STUDENT_ID)
        .eq('read', false)

    if (!isUUID(teacherId)) {
        query = query.is('teacher_id', null)
    } else {
        query = query.eq('teacher_id', teacherId)
    }

    const { count, error } = await query

    if (error) {
        console.error('Fetch unread system count error:', error)
        return 0
    }

    return count || 0
}

export async function markSystemNotificationsRead(teacherId) {
    const supabase = createAdminClient()

    let query = supabase
        .from('messages')
        .update({ read: true })
        .eq('student_id', SYSTEM_STUDENT_ID)
        .eq('read', false)

    if (!isUUID(teacherId)) {
        query = query.is('teacher_id', null)
    } else {
        query = query.eq('teacher_id', teacherId)
    }

    const { error } = await query

    if (error) {
        console.error('Mark system notifications read error:', error)
        return false
    }

    return true
}
