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
    const studentIds = Array.from(studentMap.keys())
    if (studentIds.length === 0) return []

    // SYSTEM_REMINDER を除外して学生情報を取得
    const realStudentIds = studentIds.filter(id => id !== 'SYSTEM_REMINDER')

    const { data: studentInfos, error: infoError } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name')
        .in('student_id_text', realStudentIds)

    if (infoError) {
        console.error('Fetch student info error:', infoError)
        return []
    }

    const finalConversations = studentInfos.map(info => ({
        ...info,
        name: info.full_name,
        ...studentMap.get(info.student_id_text)
    }))

    // SYSTEM_REMINDER がある場合は特別なエントリとして追加
    if (studentMap.has('SYSTEM_REMINDER')) {
        const sysEntry = studentMap.get('SYSTEM_REMINDER')
        finalConversations.push({
            student_id_text: 'SYSTEM_REMINDER',
            full_name: '🔔 システム通知',
            name: '🔔 システム通知',
            class_name: 'システム',
            ...sysEntry
        })
    }

    // 日付順にソート
    finalConversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return finalConversations
}

