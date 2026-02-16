const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
    console.log('Checking calendar_events schema...')

    // Try to select the column. If it fails, it doesn't exist.
    const { data, error } = await supabase
        .from('calendar_events')
        .select('target_class')
        .limit(1)

    if (error) {
        console.error('Error fetching target_class:', error.message)
        console.error('Full error:', JSON.stringify(error, null, 2))

        // Check if table even exists
        const { error: tableError } = await supabase.from('calendar_events').select('id').limit(1)
        if (tableError) {
            console.error('Table check error:', tableError.message)
        } else {
            console.log('Table calendar_events exists.')
        }

        process.exit(1)
    } else {
        console.log('Column target_class exists!')
        process.exit(0)
    }
}

check()
