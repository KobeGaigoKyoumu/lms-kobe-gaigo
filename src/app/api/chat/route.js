import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'
import webpush from 'web-push'

// Initialize Admin Client for bypassing RLS when needed (especially for student access)
// We reuse the service key strategy found in other API routes for consistency with existing codebase patterns
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
// Using the same service key as seen in src/app/api/attendance/route.js
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const targetStudentId = searchParams.get('studentId')
        const limit = parseInt(searchParams.get('limit') || '50')
        const before = searchParams.get('before') // timestamp for pagination
        const after = searchParams.get('after') // timestamp for polling new messages

        // 1. Identify User (Teacher vs Student)
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        // 2. Authorization Check
        let effectiveStudentId = null

        if (teacherUser) {
            // Teacher: Can view any student's messages
            effectiveStudentId = targetStudentId
        } else if (studentSession) {
            // Student: Can ONLY view their own messages
            // Re-verify that targetStudentId matches session if provided, or just defaults to session
            if (targetStudentId && targetStudentId !== studentSession.studentId) {
                return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
            }
            effectiveStudentId = studentSession.studentId
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!effectiveStudentId) {
            return NextResponse.json({ error: 'Missing student ID' }, { status: 400 })
        }

        // 3. Fetch Messages
        let query = adminSupabase
            .from('messages')
            .select('*')
            .eq('student_id', effectiveStudentId)

        // If 'after' is present, we want messages NEWER than 'after'
        // We want them in ascending order (oldest to newest) typically for appending
        if (after) {
            query = query
                .gt('created_at', after)
                .order('created_at', { ascending: true })
        } else {
            // Default / Pagination: Fetch newest first
            query = query
                .order('created_at', { ascending: false })
                .limit(limit)

            if (before) {
                query = query.lt('created_at', before)
            }
        }

        const { data, error } = await query

        if (error) throw error

        let resultMessages = data

        // If 'after' was NOT used (pagination mode), we fetched descending. 
        // We need to reverse to return ascending (oldest -> newest).
        if (!after) {
            resultMessages = data.reverse()
        }

        return NextResponse.json({ messages: resultMessages })

    } catch (error) {
        console.error('Chat API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { content, studentId, attachment_url, attachment_name, attachment_type, replyToId } = body

        if (!content && !attachment_url) return NextResponse.json({ error: 'Missing content or attachment' }, { status: 400 })

        // 1. Identify User
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        // 2. Construct Payload based on Role
        let payload = null

        if (teacherUser) {
            if (!studentId) return NextResponse.json({ error: 'Target student required' }, { status: 400 })

            payload = {
                student_id: studentId,
                teacher_id: teacherUser.id,
                sender_type: 'teacher',
                content: content || '',
                attachment_url,
                attachment_name,
                attachment_type,
                reply_to_id: replyToId || null,
                read: false
            }
        } else if (studentSession) {
            payload = {
                student_id: studentSession.studentId,
                teacher_id: null,
                sender_type: 'student',
                content: content || '',
                attachment_url,
                attachment_name,
                attachment_type,
                reply_to_id: replyToId || null,
                read: false
            }
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 3. Insert Message
        const { data, error } = await adminSupabase
            .from('messages')
            .insert([payload])
            .select()
            .single()

        if (error) throw error

        // 4. Send Push Notification
        try {
            webpush.setVapidDetails(
                'mailto:admin@lms-kobe-gaigo.vercel.app',
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
            )

            // Determine Recipient
            let recipientId = null
            let title = ''
            let url = ''

            if (data.sender_type === 'teacher') {
                recipientId = data.student_id
                title = `${data.sender_name || '先生'}からのメッセージ`
                url = '/student/communication'
            } else {
                title = '学生からのメッセージ'
                url = `/communication/${data.student_id}`

                // Find the teacher to notify (last one who interacted or specific one)
                const { data: lastTeacherMsg } = await adminSupabase
                    .from('messages')
                    .select('teacher_id')
                    .eq('student_id', data.student_id)
                    .eq('sender_type', 'teacher')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                recipientId = lastTeacherMsg?.teacher_id || data.teacher_id
            }

            if (recipientId) {
                // Fetch registered subscriptions
                const { data: subs } = await adminSupabase
                    .from('push_subscriptions')
                    .select('*')
                    .eq('user_id', recipientId)

                if (subs && subs.length > 0) {
                    const pushPayload = JSON.stringify({
                        title: title,
                        body: data.content || (data.attachment_url ? 'ファイルを送信しました' : '新着メッセージ'),
                        url: url,
                        badge: 1
                    })

                    await Promise.all(subs.map(sub =>
                        webpush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth }
                        }, pushPayload).catch(e => {
                            if (e.statusCode === 410 || e.statusCode === 404) {
                                return adminSupabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                            }
                        })
                    ))
                }
            }
        } catch (e) {
            console.error('Chat push error:', e)
        }

        return NextResponse.json({ message: data })

    } catch (error) {
        console.error('Chat Send Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const messageId = searchParams.get('id')

        if (!messageId) {
            return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
        }

        // 1. Identify User
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        // 2. Fetch the message to verify ownership
        const { data: message, error: fetchError } = await adminSupabase
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .single()

        if (fetchError || !message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        // 3. Verify Ownership
        let isOwner = false
        if (teacherUser && message.sender_type === 'teacher' && message.teacher_id === teacherUser.id) {
            isOwner = true
        } else if (studentSession && message.sender_type === 'student' && message.student_id === studentSession.studentId) {
            isOwner = true
        }

        if (!isOwner) {
            return NextResponse.json({ error: 'Unauthorized to delete this message' }, { status: 403 })
        }

        // 4. Soft Delete
        const { error: updateError } = await adminSupabase
            .from('messages')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', messageId)

        if (updateError) throw updateError

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Delete Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
