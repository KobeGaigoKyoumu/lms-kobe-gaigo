import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', 'SYSTEM_REMINDER')
        .order('created_at', { ascending: false })
        .limit(10)

    const { data: push_subscriptions, error: error2 } = await supabase
        .from('push_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    return NextResponse.json({ messages, error, push_subscriptions, error2 })
}
