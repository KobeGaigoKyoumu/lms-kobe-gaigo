
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSchema() {
    console.log('Checking students table schema...')
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
        .from('students')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching students:', error)
        return
    }

    if (data && data.length > 0) {
        console.log('Columns in students table:', Object.keys(data[0]))
    } else {
        console.log('Students table is empty, cannot infer columns from data.')
    }
}

checkSchema()
