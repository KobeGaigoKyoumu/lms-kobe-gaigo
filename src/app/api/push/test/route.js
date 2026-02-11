
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request) {
    try {
        const studentSession = await getStudentSession()
        const supabase = await createServerClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        let userId = null
        if (studentSession) {
            userId = studentSession.studentId
        } else if (authUser) {
            userId = authUser.id
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch subscription
        const { data: subs, error } = await adminSupabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId)

        if (error) {
            console.error('Fetch sub error:', error)
            return NextResponse.json({ error: 'Database error fetching subscription' }, { status: 500 })
        }

        if (!subs || subs.length === 0) {
            return NextResponse.json({ error: 'No subscription found for this user' }, { status: 404 })
        }

        const webpush = require('web-push')

        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            console.error('VAPID keys missing')
            return NextResponse.json({ error: 'Server VAPID keys missing' }, { status: 500 })
        }

        webpush.setVapidDetails(
            'mailto:admin@lms-kobe-gaigo.vercel.app',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        )

        const pushPayload = JSON.stringify({
            title: 'テスト通知',
            body: 'これはテスト通知です。通知機能は正常に動作しています。',
            url: '/',
            badge: 1,
            icon: '/icon-192.png'
        })

        const results = await Promise.allSettled(subs.map(sub =>
            webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, pushPayload)
        ))

        const successCount = results.filter(r => r.status === 'fulfilled').length
        const failures = results.filter(r => r.status === 'rejected')

        if (failures.length > 0) {
            console.error('Some push sends failed:', failures)
        }

        return NextResponse.json({
            success: true,
            message: `Sent to ${successCount} devices. Failed: ${failures.length}`,
            debug: { userId, subCount: subs.length }
        })

    } catch (error) {
        console.error('Test Push Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
