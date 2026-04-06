import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugReminders() {
    console.log('--- Debugging Kanban Reminders ---')
    
    // 1. Check reminders
    const { data: reminders, error: remErr } = await supabase
        .from('kanban_reminders')
        .select('*, kanban_cards!inner(title, description)')
        .eq('enabled', true)

    if (remErr) {
        console.error('Error fetching reminders:', remErr)
        return
    }

    console.log(`Found ${reminders.length} enabled reminders:`)
    reminders.forEach(r => {
        console.log(`- ID: ${r.id}, Time: ${r.remind_time}, Type: ${r.reminder_type}, Last Sent: ${r.last_sent_at}, Card: ${r.kanban_cards.title}`)
    })

    // 2. Check staff profiles
    const { data: staffProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', ['teacher', 'admin'])

    console.log(`\nFound ${staffProfiles?.length || 0} staff in profiles:`, staffProfiles)

    // 3. Check admin_members
    const { data: adminMembers, error: adminErr } = await supabase
        .from('admin_members')
        .select('id, name')

    console.log(`\nFound ${adminMembers?.length || 0} admin_members:`, adminMembers)

    // 4. Check push subscriptions
    const { data: allSubs, error: subErr } = await supabase
        .from('push_subscriptions')
        .select('*')

    console.log(`\nFound ${allSubs?.length || 0} push subscriptions.`)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const staffSubs = (allSubs || []).filter((s) => uuidRegex.test(s.user_id) || s.user_id === 'member')
    console.log(`Staff-like subscriptions: ${staffSubs.length}`)
}

debugReminders()
