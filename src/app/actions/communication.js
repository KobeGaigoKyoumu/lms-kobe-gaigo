'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const createAdminClient = () => {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

export async function getConversations() {
    const supabase = createAdminClient()

    // Fetch all messages
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Fetch messages error:', error)
        return []
    }

    // Group by student and get last message + unread count
    const studentMap = new Map()
    messages.forEach(msg => {
        if (!studentMap.has(msg.student_id)) {
            studentMap.set(msg.student_id, {
                student_id_text: msg.student_id,
                last_message: msg.content,
                unread_count: 0,
                created_at: msg.created_at
            })
        }
        if (!msg.read && msg.sender_type === 'student') {
            studentMap.get(msg.student_id).unread_count++
        }
    })

    // Join with students table to get names/classes
    // SYSTEM_REMINDER はミニチャットウィジェットで表示するため除外
    const allIds = Array.from(studentMap.keys()).filter(id => id !== 'SYSTEM_REMINDER')
    if (allIds.length === 0) return []

    // 1. Fetch from students
    const { data: studentInfos, error: infoError } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name')
        .in('student_id_text', allIds)

    // 2. Fetch from admin_members
    const { data: staffInfos, error: staffError } = await supabase
        .from('admin_members')
        .select('id, name')
        .in('id', allIds)

    const infoMap = new Map()
    if (studentInfos) {
        studentInfos.forEach(s => infoMap.set(s.student_id_text, {
            name: s.full_name,
            class_name: s.class_name
        }))
    }
    if (staffInfos) {
        staffInfos.forEach(s => infoMap.set(s.id, {
            name: `${s.name} (スタッフ)`,
            class_name: '教職員'
        }))
    }

    const finalConversations = Array.from(studentMap.keys())
        .filter(id => id !== 'SYSTEM_REMINDER' && infoMap.has(id))
        .map(id => ({
            ...infoMap.get(id),
            student_id_text: id,
            ...studentMap.get(id)
        })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return finalConversations
}

