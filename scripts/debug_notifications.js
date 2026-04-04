const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
        .from('messages')
        .select('created_at, content')
        .eq('student_id', 'SYSTEM_REMINDER')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error(error)
        return
    }

    console.log('Last 5 System Notifications:')
    data.forEach(m => {
        console.log(`[${m.created_at}] ${m.content.substring(0, 50)}...`)
    })
}

check()
