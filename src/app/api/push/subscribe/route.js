import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getStudentSession } from '@/app/actions/studentAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
// Hardcoded fallback for service key if env var is missing
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request) {
    try {
        const body = await request.json()
        const { subscription } = body

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ error: 'Subscription data required' }, { status: 400 })
        }

        // 1. Identify User
        const studentSession = await getStudentSession()
        const supabase = await createServerClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        let userId = null
        if (studentSession) {
            // Priority 1: Student (always use student number)
            userId = studentSession.studentId
        } else if (authUser) {
            // Priority 2: Teacher/Admin (use Supabase UUID)
            userId = authUser.id
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
