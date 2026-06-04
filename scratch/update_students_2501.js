const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.preview.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Environment variables missing')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function update() {
    console.log('Starting student status update...')
    
    const { data, error } = await supabase
        .from('students')
        .update({ status: 'graduated', updated_at: new Date().toISOString() })
        .like('student_id_text', '2501%')
        .eq('status', 'active')
        .select('student_id_text, full_name, class_name, status')

    if (error) {
        console.error('Error updating students:', error)
    } else {
        console.log('Successfully updated students:', data)
        console.log('Total updated:', data.length)
    }
}

update()
