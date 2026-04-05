'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { unstable_cache, revalidateTag } from 'next/cache'

// Reuse the service key approach from api/chat/route.js for admin access
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function getUnreadCount() {
    try {
        // 1. Identify User
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()
        const adminMember = await getAdminMemberSession()

        let countQuery = adminSupabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('read', false)
            .neq('student_id', 'SYSTEM_REMINDER')

        if (teacherUser || adminMember) {
            // Teacher/Admin/Staff: Count all unread messages from students
            countQuery = countQuery.eq('sender_type', 'student')
        } else if (studentSession) {
            // Student: Count unread messages from teachers
            countQuery = countQuery
                .eq('student_id', studentSession.studentId)
                .eq('sender_type', 'teacher')
        } else {
            return 0
        }

        const { count, error } = await countQuery

        if (error) {
            console.error('Error fetching unread count:', error)
            return 0
        }

        return count || 0
    } catch (error) {
        console.error('Server Action Error:', error)
        return 0
    }
}

// Optimization: Cached Conversation List
const _getRecentConversations = unstable_cache(
    async () => {
        try {
            // 1. Fetch recent messages (e.g., last 2000)
            const { data: messages, error } = await adminSupabase
                .from('messages')
                .select('student_id, content, created_at, read, sender_type')
                .order('created_at', { ascending: false })
                .limit(2000)

            if (error) throw error

            // 2. Aggregate by Student
            const conversationsMap = new Map()

            messages.forEach(msg => {
                if (!conversationsMap.has(msg.student_id)) {
                    conversationsMap.set(msg.student_id, {
                        student_id_text: msg.student_id,
                        last_message: msg.content,
                        last_message_at: msg.created_at,
                        unread_count: 0
                    })
                }

                // Count unread 
                if (msg.sender_type === 'student' && !msg.read) {
                    const conv = conversationsMap.get(msg.student_id)
                    conv.unread_count += 1
                }
            })

            const conversationList = Array.from(conversationsMap.values())

            // 3. Fetch Student Details
            const studentIds = conversationList.map(c => c.student_id_text)
            if (studentIds.length > 0) {
                const { data: students } = await adminSupabase
                    .from('students')
                    .select('student_id_text, full_name, class_name')
                    .in('student_id_text', studentIds)

                const studentMap = new Map(students?.map(s => [s.student_id_text, s]))

                conversationList.forEach(conv => {
                    const details = studentMap.get(conv.student_id_text)
                    if (details) {
                        conv.name = details.full_name
                        conv.class_name = details.class_name
                    } else {
                        conv.name = `Unknown (${conv.student_id_text})`
                    }
                })
            }

            return conversationList
        } catch (error) {
            console.error('Cached Conversations Error:', error)
            return []
        }
    },
    ['chat-conversations-list'],
    { tags: ['chat-messages'] }
)

export async function getRecentConversations() {
    return _getRecentConversations()
}

// Fetch Messages Action (Securely using service_role for students)
export async function getMessages(studentId, options = {}) {
    const {
        limit = 30,
        before = null,
        after = null
    } = options

    try {
        let query = adminSupabase
            .from('messages')
            .select('*')
            .eq('student_id', studentId)

        if (before) {
            query = query.lt('created_at', before)
        }
        if (after) {
            query = query.gt('created_at', after)
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return { data: data || [] }
    } catch (err) {
        console.error('getMessages error:', err)
        return { error: 'Failed to fetch messages', data: [] }
    }
}


// Send Message Action (to replace API or simply invalidate)
export async function sendMessage(studentId, content, options = {}) {
    const {
        senderType = 'teacher',
        attachmentUrl = null,
        attachmentName = null,
        attachmentType = null,
        replyToId = null
    } = options

    try {
        // Verify session for staff if needed
        const adminMember = await getAdminMemberSession()
        const studentSession = await getStudentSession()
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        const senderId = user?.id || adminMember?.memberId || 'admin'
        
        // Profiles table only contains Auth users (students/teachers)
        const profileId = user ? user.id : null

        const payload = {
            student_id: studentId,
            teacher_id: profileId, // points to profiles.id (nullable)
            content: content || '',
            sender_type: senderType,
            read: false,
            created_at: new Date().toISOString()
        }

        if (attachmentUrl) payload.attachment_url = attachmentUrl
        if (attachmentName) payload.attachment_name = attachmentName
        if (attachmentType) payload.attachment_type = attachmentType
        if (replyToId) payload.reply_to_id = replyToId

        const { data, error } = await adminSupabase
            .from('messages')
            .insert(payload)
            .select()
            .single()

        if (error) throw error

        // Invalidate the conversations cache so listing updates immediately
        revalidateTag('chat-messages')
        return { success: true, data }
    } catch (err) {
        console.error('Send message error:', err)
        return { error: 'Failed to send' }
    }
}
