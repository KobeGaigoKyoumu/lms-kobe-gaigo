import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request) {
    try {
        const body = await request.json()
        const { studentIds, content, attachment_url, attachment_name, attachment_type } = body

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: 'Missing target student IDs' }, { status: 400 })
        }
        if (!content && !attachment_url) {
            return NextResponse.json({ error: 'Missing content or attachment' }, { status: 400 })
        }

        // 1. Auth Check (Teacher only)
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()

        if (!teacherUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Prepare Payloads
        const payloads = studentIds.map(sid => ({
            student_id: sid,
            teacher_id: teacherUser.id,
            sender_type: 'teacher',
            content: content || '',
            attachment_url,
            attachment_name,
            attachment_type,
            read: false
        }))

        // 3. Insert Messages
        const { data, error } = await adminSupabase
            .from('messages')
            .insert(payloads)
            .select()

        if (error) throw error

            // 4. Send Push Notifications (Background)
            (async () => {
                try {
                    const webpush = require('web-push')
                    webpush.setVapidDetails(
                        'mailto:admin@lms-kobe-gaigo.vercel.app',
                        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                        process.env.VAPID_PRIVATE_KEY
                    )

                    // Fetch subscriptions for all targeted students
                    const { data: subs } = await adminSupabase
                        .from('push_subscriptions')
                        .select('*')
                        .in('user_id', studentIds)

                    if (subs && subs.length > 0) {
                        const pushPayload = JSON.stringify({
                            title: '先生からのメッセージ',
                            body: content || (attachment_url ? 'ファイルを送信しました' : 'メッセージが届きました'),
                            url: '/student/communication',
                            badge: 1 // Single unread for a new message
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
                } catch (e) {
                    console.error('Broadcast push error:', e)
                }
            })()

        return NextResponse.json({ success: true, count: data.length })

    } catch (error) {
        console.error('Broadcast API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
