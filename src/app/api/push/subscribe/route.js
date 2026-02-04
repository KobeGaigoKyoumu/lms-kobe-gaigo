import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request) {
    try {
        const body = await request.json()
        const { subscription } = body

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ error: 'Subscription data required' }, { status: 400 })
        }

        // 1. ユーザーを特定
        const supabase = await createServerClient()
        const { data: { user: teacherUser } } = await supabase.auth.getUser()
        const studentSession = await getStudentSession()

        let userId = null
        if (teacherUser) {
            userId = teacherUser.id
        } else if (studentSession) {
            userId = studentSession.studentId
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. 購読情報を保存 (Upsert)
        const { error } = await adminSupabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'endpoint'
            })

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Push Subscribe Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
