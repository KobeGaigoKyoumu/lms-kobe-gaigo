import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try {
        // 1. Auth Check (Teacher only)
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Fetch all messages
        // Efficient query: We really want "Group By student_id, latest message"
        // Supabase/Postgres doesn't support easy "Last Value" in standard Select without Distinct On or similar.
        // We will fetch all messages for now (performance warning) or use a clever query.
        // Better: Fetch Unique Student IDs from specific range?
        // Let's use `.rpc()` if we had a function, but we don't.

        // Alternative: Fetch students master first, then see if they have messages? No, too many students.

        // Let's rely on JS aggregation for V1 (assuming < 10k messages for now).
        // Or better: Just fetch messages from the last 30 days?

        // Let's try to get distinct student IDs.
        // Or we can query `messages` and order by `created_at desc` limit 1000, then dedup in JS.

        const { data: messages, error } = await adminSupabase
            .from('messages')
            .select('student_id, content, created_at, read, sender_type')
            .order('created_at', { ascending: false })
            .limit(2000)

        if (error) throw error

        // 3. Aggregate by Student
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

            // Count unread (only if sent BY student and NOT read)
            if (msg.sender_type === 'student' && !msg.read) {
                const conv = conversationsMap.get(msg.student_id)
                conv.unread_count += 1
            }
        })

        const conversationList = Array.from(conversationsMap.values())

        // 4. Fetch Student Details (Name, Class) for these IDs
        const studentIds = conversationList.map(c => c.student_id_text)

        if (studentIds.length > 0) {
            const { data: students } = await adminSupabase
                .from('students')
                .select('student_id_text, full_name, class_name')
                .in('student_id_text', studentIds)

            // Merge details
            const studentMap = new Map(students.map(s => [s.student_id_text, s]))

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

        return NextResponse.json({ conversations: conversationList })

    } catch (error) {
        console.error('Conversations API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
